<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$config = require __DIR__ . '/config.php';

const GLOBAL_COLUMN_SYNONYMS = [
    'name' => ['nev', 'név', 'tag_nev', 'tagnev', 'modell', 'modellnev', 'modell_nev', 'model', 'modelnev', 'model_name'],
    'username' => ['felhasznalonev', 'felhasznalo_nev', 'usernev', 'user_name', 'login', 'loginnev', 'login_name'],
    'created_at' => ['letrehozva', 'letrehozas', 'letrehozas_datuma', 'letrehozva_datum', 'rogzitve', 'rogzitve_datum', 'keszites_datuma', 'datum', 'created'],
];

$columnAliasConfig = prepareColumnAliasConfig($config['column_aliases'] ?? []);
$resolvedColumnMap = initializeResolvedColumnMap($columnAliasConfig);

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );

    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $exception) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Nem sikerült csatlakozni az adatbázishoz.',
        'details' => $exception->getMessage(),
    ]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = [];
}

$table = $input['table'] ?? $_GET['table'] ?? null;
$action = $input['action'] ?? $_GET['action'] ?? null;

if (!$table || !$action) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Hiányzó táblanév vagy művelet típus.'
    ]);
    exit;
}

if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Érvénytelen táblanév.'
    ]);
    exit;
}

try {
    switch ($action) {
        case 'select':
            handleSelect($pdo, $table, $input);
            break;
        case 'insert':
            handleInsert($pdo, $table, $input);
            break;
        case 'update':
            handleUpdate($pdo, $table, $input);
            break;
        case 'delete':
            handleDelete($pdo, $table, $input);
            break;
        default:
            http_response_code(400);
            echo json_encode([
                'error' => 'Ismeretlen művelet: ' . $action
            ]);
            break;
    }
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Az adatbázis művelet közben hiba történt.',
        'details' => $exception->getMessage(),
    ]);
}

function handleSelect(PDO $pdo, string $table, array $input): void
{
    $columns = $input['columns'] ?? '*';
    $filters = $input['filters'] ?? [];
    $order = $input['order'] ?? null;
    $limit = $input['limit'] ?? null;
    $offset = $input['offset'] ?? null;
    $single = (bool)($input['single'] ?? false);

    $columnList = '*';
    if ($columns !== '*') {
        $columnNames = array_filter(array_map('trim', explode(',', (string) $columns)), 'strlen');

        if ($columnNames) {
            $selectParts = [];

            foreach ($columnNames as $columnName) {
                if ($columnName === '*') {
                    $selectParts = ['*'];
                    break;
                }

                [$actualColumn, $alias] = resolveColumn($pdo, $table, $columnName);
                $columnIdentifier = quoteIdentifier($actualColumn);

                if ($actualColumn !== $alias) {
                    $selectParts[] = sprintf('%s AS %s', $columnIdentifier, quoteIdentifier($alias));
                } else {
                    $selectParts[] = $columnIdentifier;
                }
            }

            if ($selectParts && $selectParts[0] !== '*') {
                $columnList = implode(', ', $selectParts);
            }
        }
    }

    $sql = sprintf('SELECT %s FROM %s', $columnList, quoteIdentifier($table));
    $params = [];

    [$whereSql, $whereParams] = buildWhereClause($pdo, $table, $filters);
    if ($whereSql !== '') {
        $sql .= ' WHERE ' . $whereSql;
        $params = array_merge($params, $whereParams);
    }

    if ($order && isset($order['column'])) {
        [$orderColumn] = resolveColumn($pdo, $table, (string) $order['column']);
        $direction = ($order['ascending'] ?? true) ? 'ASC' : 'DESC';
        $sql .= ' ORDER BY ' . quoteIdentifier($orderColumn) . ' ' . $direction;
    }

    if (is_numeric($limit)) {
        $limitValue = max(0, (int) $limit);
        $sql .= ' LIMIT ' . $limitValue;

        if (is_numeric($offset)) {
            $offsetValue = max(0, (int) $offset);
            $sql .= ' OFFSET ' . $offsetValue;
        }
    }

    $statement = $pdo->prepare($sql);
    foreach ($params as $placeholder => $value) {
        $statement->bindValue($placeholder, $value);
    }

    $statement->execute();
    $rows = $statement->fetchAll();
    $rows = array_map(fn(array $row) => applyAliasesToRow($row, $table), $rows);

    if ($single) {
        $row = $rows[0] ?? null;
        echo json_encode(['data' => $row]);
        return;
    }

    echo json_encode(['data' => $rows]);
}

function handleInsert(PDO $pdo, string $table, array $input): void
{
    $data = $input['data'] ?? [];
    $returning = $input['returning'] ?? null;

    if (empty($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Nincs megadva beillesztendő adat.']);
        return;
    }

    if (!is_array($data)) {
        $data = [$data];
    }

    $inserted = [];

    foreach ($data as $record) {
        if (!is_array($record)) {
            continue;
        }

        $mappedRecord = mapRecordForWrite($pdo, $table, $record);
        if (!$mappedRecord) {
            continue;
        }

        $columns = array_keys($mappedRecord);
        $placeholders = array_map(fn($column) => ':' . $column, $columns);
        $columnIdentifiers = array_map('quoteIdentifier', $columns);

        $sql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            quoteIdentifier($table),
            implode(', ', $columnIdentifiers),
            implode(', ', $placeholders)
        );

        $statement = $pdo->prepare($sql);

        foreach ($mappedRecord as $column => $value) {
            $statement->bindValue(':' . $column, $value);
        }

        $statement->execute();

        $outputRecord = $mappedRecord;
        if ($pdo->lastInsertId()) {
            $outputRecord['id'] = (int) $pdo->lastInsertId();
        }

        $outputRecord = applyAliasesToRow($outputRecord, $table);
        $inserted[] = filterRecordColumns($outputRecord, $returning);
    }

    echo json_encode(['data' => $inserted]);
}

function handleUpdate(PDO $pdo, string $table, array $input): void
{
    $data = $input['data'] ?? [];
    $filters = $input['filters'] ?? [];

    if (!$data || !is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Nincs megadva frissítendő adat.']);
        return;
    }

    if (empty($filters)) {
        http_response_code(400);
        echo json_encode(['error' => 'Frissítéshez szűrő feltétel szükséges.']);
        return;
    }

    $setParts = [];
    $params = [];

    $mappedData = mapRecordForWrite($pdo, $table, $data);
    if (!$mappedData) {
        http_response_code(400);
        echo json_encode(['error' => 'Nincs frissíthető oszlop.']);
        return;
    }
    foreach ($mappedData as $column => $value) {
        $placeholder = ':' . uniqid('set', false);
        $setParts[] = quoteIdentifier($column) . ' = ' . $placeholder;
        $params[$placeholder] = $value;
    }

    [$whereSql, $whereParams] = buildWhereClause($pdo, $table, $filters);
    if ($whereSql === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Érvényes szűrő nélkül nem hajtható végre frissítés.']);
        return;
    }
    $params = array_merge($params, $whereParams);

    $sql = sprintf(
        'UPDATE %s SET %s %s',
        quoteIdentifier($table),
        implode(', ', $setParts),
        $whereSql ? 'WHERE ' . $whereSql : ''
    );

    $statement = $pdo->prepare($sql);
    foreach ($params as $placeholder => $value) {
        $statement->bindValue($placeholder, $value);
    }

    $statement->execute();

    echo json_encode(['data' => ['affectedRows' => $statement->rowCount()]]);
}

function handleDelete(PDO $pdo, string $table, array $input): void
{
    $filters = $input['filters'] ?? [];

    if (empty($filters)) {
        http_response_code(400);
        echo json_encode(['error' => 'Törléshez szűrő feltétel szükséges.']);
        return;
    }

    [$whereSql, $params] = buildWhereClause($pdo, $table, $filters);
    if ($whereSql === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Érvényes szűrő nélkül nem hajtható végre törlés.']);
        return;
    }

    $sql = sprintf('DELETE FROM %s WHERE %s', quoteIdentifier($table), $whereSql);
    $statement = $pdo->prepare($sql);

    foreach ($params as $placeholder => $value) {
        $statement->bindValue($placeholder, $value);
    }

    $statement->execute();

    echo json_encode(['data' => ['affectedRows' => $statement->rowCount()]]);
}

function buildWhereClause(PDO $pdo, string $table, array $filters): array
{
    $whereParts = [];
    $params = [];

    foreach ($filters as $filter) {
        if (!isset($filter['column'], $filter['operator'])) {
            continue;
        }

        [$actualColumn] = resolveColumn($pdo, $table, (string) $filter['column']);
        $column = quoteIdentifier($actualColumn);
        $operator = strtolower((string) $filter['operator']);
        $placeholder = ':' . uniqid('w', false);

        switch ($operator) {
            case 'eq':
                $whereParts[] = sprintf('%s = %s', $column, $placeholder);
                $params[$placeholder] = $filter['value'] ?? null;
                break;
            default:
                throw new InvalidArgumentException('Nem támogatott szűrő operátor: ' . $operator);
        }
    }

    return [implode(' AND ', $whereParts), $params];
}

function quoteIdentifier(string $identifier): string
{
    if ($identifier === '*') {
        return '*';
    }

    if (!preg_match('/^[\p{L}\p{N}_]+$/u', $identifier)) {
        throw new InvalidArgumentException('Érvénytelen oszlopnév: ' . $identifier);
    }

    return '`' . $identifier . '`';
}

function filterRecordColumns(array $record, $returning)
{
    if (!$returning || $returning === '*') {
        return $record;
    }

    $columns = array_filter(array_map('trim', explode(',', (string) $returning)));
    if (!$columns) {
        return $record;
    }

    $filtered = [];
    foreach ($columns as $column) {
        if (array_key_exists($column, $record)) {
            $filtered[$column] = $record[$column];
        }
    }

    return $filtered;
}

function prepareColumnAliasConfig(array $config): array
{
    $prepared = [];

    foreach ($config as $table => $aliases) {
        if (!is_array($aliases)) {
            continue;
        }

        $tableKey = lowercase_key($table);

        foreach ($aliases as $alias => $actual) {
            if (!is_string($alias) || $alias === '' || !is_string($actual) || $actual === '') {
                continue;
            }

            $prepared[$tableKey][lowercase_key($alias)] = [
                'alias' => $alias,
                'actual' => $actual,
            ];
        }
    }

    return $prepared;
}

function initializeResolvedColumnMap(array $columnAliasConfig): array
{
    $resolved = [];

    foreach ($columnAliasConfig as $tableKey => $aliases) {
        foreach ($aliases as $aliasKey => $info) {
            $resolved[$tableKey][$aliasKey] = [
                'alias' => $info['alias'],
                'actual' => $info['actual'],
            ];
        }
    }

    return $resolved;
}

function rememberResolvedAlias(string $table, string $alias, string $actual): void
{
    global $resolvedColumnMap;

    $tableKey = lowercase_key($table);
    $aliasKey = lowercase_key($alias);

    if (!isset($resolvedColumnMap[$tableKey][$aliasKey])) {
        $resolvedColumnMap[$tableKey][$aliasKey] = [
            'alias' => $alias,
            'actual' => $actual,
        ];

        return;
    }

    $resolvedColumnMap[$tableKey][$aliasKey]['alias'] = $alias;
    $resolvedColumnMap[$tableKey][$aliasKey]['actual'] = $actual;
}

function getConfiguredAlias(string $table, string $alias): ?string
{
    global $columnAliasConfig;

    $tableKey = lowercase_key($table);
    $aliasKey = lowercase_key($alias);

    return $columnAliasConfig[$tableKey][$aliasKey]['actual'] ?? null;
}

function resolveColumn(PDO $pdo, string $table, string $requested): array
{
    $requested = trim($requested);

    if ($requested === '') {
        throw new InvalidArgumentException('Hiányzó oszlopnév.');
    }

    if ($requested === '*') {
        return ['*', '*'];
    }

    $columns = getTableColumns($pdo, $table);

    $match = matchColumnName($columns, $requested);
    if ($match !== null) {
        rememberResolvedAlias($table, $requested, $match);
        return [$match, $requested];
    }

    $configuredActual = getConfiguredAlias($table, $requested);
    if ($configuredActual !== null) {
        $match = matchColumnName($columns, $configuredActual);
        if ($match !== null) {
            rememberResolvedAlias($table, $requested, $match);
            return [$match, $requested];
        }

        throw new InvalidArgumentException(sprintf(
            'Az alias konfiguráció érvénytelen: %s → %s (nincs ilyen oszlop).',
            $requested,
            $configuredActual
        ));
    }

    $lowerRequested = lowercase_key($requested);
    $synonyms = GLOBAL_COLUMN_SYNONYMS[$lowerRequested] ?? [];
    foreach ($synonyms as $synonym) {
        $match = matchColumnName($columns, $synonym);
        if ($match !== null) {
            rememberResolvedAlias($table, $requested, $match);
            return [$match, $requested];
        }
    }

    throw new InvalidArgumentException(sprintf(
        'A(z) %s oszlop nem található a(z) %s táblában. Add hozzá az aliasokhoz az api/config.php fájlban.',
        $requested,
        $table
    ));
}

function matchColumnName(array $columns, string $target): ?string
{
    foreach ($columns as $column) {
        if (identifiersMatch($column, $target)) {
            return $column;
        }
    }

    $targetNormalized = normalizeIdentifier($target);
    foreach ($columns as $column) {
        if ($targetNormalized !== '' && $targetNormalized === normalizeIdentifier($column)) {
            return $column;
        }
    }

    $targetLower = lowercase_key($target);
    foreach ($columns as $column) {
        if ($targetLower !== '' && str_contains(lowercase_key($column), $targetLower)) {
            return $column;
        }
    }

    return null;
}

function identifiersMatch(string $left, string $right): bool
{
    if (lowercase_key($left) === lowercase_key($right)) {
        return true;
    }

    return normalizeIdentifier($left) === normalizeIdentifier($right);
}

function normalizeIdentifier(string $value): string
{
    $lower = lowercase_key($value);

    if (function_exists('iconv')) {
        $transliterated = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $lower);
        if ($transliterated !== false) {
            $lower = $transliterated;
        }
    }

    $normalized = preg_replace('/[^a-z0-9]+/', '', $lower);

    return $normalized ?? '';
}

function lowercase_key(string $value): string
{
    return function_exists('mb_strtolower')
        ? mb_strtolower($value, 'UTF-8')
        : strtolower($value);
}

function mapRecordForWrite(PDO $pdo, string $table, array $record): array
{
    $mapped = [];

    foreach ($record as $column => $value) {
        if (!is_string($column)) {
            continue;
        }

        [$actualColumn] = resolveColumn($pdo, $table, $column);
        if ($actualColumn === '*') {
            continue;
        }

        $mapped[$actualColumn] = $value;
    }

    return $mapped;
}

function applyAliasesToRow(array $row, string $table): array
{
    global $resolvedColumnMap;

    $tableKey = lowercase_key($table);
    $aliases = $resolvedColumnMap[$tableKey] ?? [];

    foreach ($aliases as $info) {
        $alias = $info['alias'];
        $actual = $info['actual'];

        if ($alias === $actual) {
            continue;
        }

        if (array_key_exists($actual, $row) && !array_key_exists($alias, $row)) {
            $row[$alias] = $row[$actual];
        }
    }

    foreach (GLOBAL_COLUMN_SYNONYMS as $alias => $synonyms) {
        if (array_key_exists($alias, $row)) {
            continue;
        }

        foreach ($synonyms as $synonym) {
            foreach ($row as $columnName => $value) {
                if (identifiersMatch($columnName, $synonym)) {
                    $row[$alias] = $value;
                    rememberResolvedAlias($table, $alias, $columnName);
                    break 2;
                }
            }
        }
    }

    return $row;
}

function getTableColumns(PDO $pdo, string $table): array
{
    static $cache = [];

    $tableKey = lowercase_key($table);

    if (!isset($cache[$tableKey])) {
        $statement = $pdo->query('SHOW COLUMNS FROM ' . quoteIdentifier($table));
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);
        $cache[$tableKey] = array_map(
            static fn(array $row) => $row['Field'] ?? '',
            $rows
        );
    }

    return $cache[$tableKey];
}

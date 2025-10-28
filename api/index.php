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
        $columnNames = array_map('trim', explode(',', (string) $columns));
        $columnIdentifiers = array_map('quoteIdentifier', $columnNames);
        $columnList = implode(', ', $columnIdentifiers);
    }

    $sql = sprintf('SELECT %s FROM %s', $columnList, quoteIdentifier($table));
    $params = [];

    if ($filters) {
        $whereParts = [];
        foreach ($filters as $filter) {
            if (!isset($filter['column'], $filter['operator'])) {
                continue;
            }

            $column = quoteIdentifier((string) $filter['column']);
            $operator = strtolower((string) $filter['operator']);
            $placeholder = ':' . uniqid('p', false);

            switch ($operator) {
                case 'eq':
                    $whereParts[] = sprintf('%s = %s', $column, $placeholder);
                    $params[$placeholder] = $filter['value'] ?? null;
                    break;
                default:
                    throw new InvalidArgumentException('Nem támogatott szűrő operátor: ' . $operator);
            }
        }

        if ($whereParts) {
            $sql .= ' WHERE ' . implode(' AND ', $whereParts);
        }
    }

    if ($order && isset($order['column'])) {
        $direction = ($order['ascending'] ?? true) ? 'ASC' : 'DESC';
        $sql .= ' ORDER BY ' . quoteIdentifier((string) $order['column']) . ' ' . $direction;
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

        $columns = array_keys($record);
        $placeholders = array_map(fn($column) => ':' . $column, $columns);
        $columnIdentifiers = array_map('quoteIdentifier', $columns);

        $sql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            quoteIdentifier($table),
            implode(', ', $columnIdentifiers),
            implode(', ', $placeholders)
        );

        $statement = $pdo->prepare($sql);

        foreach ($record as $column => $value) {
            $statement->bindValue(':' . $column, $value);
        }

        $statement->execute();

        if ($pdo->lastInsertId()) {
            $record['id'] = (int) $pdo->lastInsertId();
        }

        $inserted[] = filterRecordColumns($record, $returning);
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

    foreach ($data as $column => $value) {
        $placeholder = ':' . uniqid('set', false);
        $setParts[] = quoteIdentifier((string) $column) . ' = ' . $placeholder;
        $params[$placeholder] = $value;
    }

    [$whereSql, $whereParams] = buildWhereClause($filters);
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

    [$whereSql, $params] = buildWhereClause($filters);
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

function buildWhereClause(array $filters): array
{
    $whereParts = [];
    $params = [];

    foreach ($filters as $filter) {
        if (!isset($filter['column'], $filter['operator'])) {
            continue;
        }

        $column = quoteIdentifier((string) $filter['column']);
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
    if (!preg_match('/^[A-Za-z0-9_]+$/', $identifier)) {
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

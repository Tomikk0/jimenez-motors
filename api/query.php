<?php
declare(strict_types=1);

$payload = [];
$responseCode = 200;
$result = null;
$error = null;

try {
    $configPath = __DIR__ . '/config.php';
    if (!file_exists($configPath)) {
        throw new RuntimeException('Hiányzik az api/config.php konfiguráció. Másold a config.sample.php fájlt config.php néven.');
    }

    $config = require $configPath;

    handleCors($config['allowed_origins'] ?? ['*']);

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new InvalidArgumentException('Csak POST metódus engedélyezett.');
    }

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?? '', true);

    if (!is_array($payload)) {
        throw new InvalidArgumentException('Érvénytelen JSON tartalom.');
    }

    if (empty($payload['table']) || empty($payload['action'])) {
        throw new InvalidArgumentException('A "table" és az "action" mező kötelező.');
    }

    $pdo = createConnection($config);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    $result = executeQuery($pdo, $payload);
} catch (Throwable $exception) {
    $responseCode = $exception instanceof InvalidArgumentException ? 400 : 500;
    $error = [
        'message' => $exception->getMessage(),
        'type' => $exception instanceof InvalidArgumentException ? 'client_error' : 'server_error',
    ];
}

http_response_code($responseCode);
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'data' => $error ? null : $result,
    'error' => $error,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

function handleCors(array $allowedOrigins): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array('*', $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: *');
    } elseif ($origin && in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }

    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

function createConnection(array $config): PDO
{
    $host = $config['host'] ?? 'localhost';
    $port = (int)($config['port'] ?? 3306);
    $db = $config['database'] ?? '';
    $charset = $config['charset'] ?? 'utf8mb4';

    if ($db === '') {
        throw new RuntimeException('A konfigurációban add meg az adatbázis nevét.');
    }

    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $db, $charset);

    return new PDO($dsn, $config['username'] ?? '', $config['password'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
}

function executeQuery(PDO $pdo, array $payload)
{
    $table = sanitizeIdentifier($payload['table']);

    switch ($payload['action']) {
        case 'select':
            return executeSelect($pdo, $table, $payload);
        case 'insert':
            return executeInsert($pdo, $table, $payload);
        case 'update':
            return executeUpdate($pdo, $table, $payload);
        case 'delete':
            return executeDelete($pdo, $table, $payload);
        default:
            throw new InvalidArgumentException('Nem támogatott művelet: ' . $payload['action']);
    }
}

function executeSelect(PDO $pdo, string $table, array $payload)
{
    [$whereClause, $params] = buildWhereClause($payload['filters'] ?? []);

    $columns = parseColumns($payload['columns'] ?? '*');
    $orderClause = buildOrderClause($payload['order'] ?? []);

    $sql = 'SELECT ' . $columns . ' FROM ' . $table;
    if ($whereClause) {
        $sql .= ' ' . $whereClause;
    }
    if ($orderClause) {
        $sql .= ' ' . $orderClause;
    }

    $limit = $payload['limit'] ?? null;
    $offset = $payload['offset'] ?? null;

    if ($limit !== null && $limit !== '') {
        $sql .= ' LIMIT ?';
        $params[] = (int)$limit;
    }

    if ($offset !== null && $offset !== '') {
        if ($limit === null || $limit === '') {
            $sql .= ' LIMIT 18446744073709551615';
        }
        $sql .= ' OFFSET ?';
        $params[] = (int)$offset;
    }

    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    $rows = $statement->fetchAll();

    if (!empty($payload['single'])) {
        return $rows[0] ?? null;
    }

    return $rows;
}

function executeInsert(PDO $pdo, string $table, array $payload)
{
    $records = $payload['data'] ?? [];
    if (!is_array($records) || empty($records)) {
        throw new InvalidArgumentException('Az insert művelethez adj meg adatokat.');
    }

    if (array_is_list($records)) {
        $rows = $records;
    } else {
        $rows = [$records];
    }

    $firstRow = $rows[0] ?? [];
    if (!is_array($firstRow) || empty($firstRow)) {
        throw new InvalidArgumentException('Az insert adatok üresek.');
    }

    $columns = array_keys($firstRow);
    $placeholders = '(' . implode(', ', array_fill(0, count($columns), '?')) . ')';
    $columnList = implode(', ', array_map('sanitizeIdentifier', $columns));

    $values = [];
    foreach ($rows as $row) {
        foreach ($columns as $column) {
            $values[] = $row[$column] ?? null;
        }
    }

    $sql = sprintf('INSERT INTO %s (%s) VALUES %s', $table, $columnList, implode(', ', array_fill(0, count($rows), $placeholders)));
    $statement = $pdo->prepare($sql);
    $statement->execute($values);

    if (!empty($payload['returning'])) {
        $returningColumns = parseColumns($payload['returning']);
        $firstId = (int)$pdo->lastInsertId();
        $count = $statement->rowCount();

        if ($firstId > 0 && $count > 0) {
            $ids = range($firstId, $firstId + $count - 1);
            $placeholders = implode(', ', array_fill(0, count($ids), '?'));
            $sql = sprintf('SELECT %s FROM %s WHERE %s IN (%s)', $returningColumns, $table, sanitizeIdentifier('id'), $placeholders);
            $select = $pdo->prepare($sql);
            $select->execute($ids);
            return $select->fetchAll();
        }
    }

    return ['insertedCount' => $statement->rowCount()];
}

function executeUpdate(PDO $pdo, string $table, array $payload)
{
    $updates = $payload['data'] ?? [];
    if (!is_array($updates) || empty($updates)) {
        throw new InvalidArgumentException('Az update művelethez adj meg frissítendő mezőket.');
    }

    [$whereClause, $whereParams] = buildWhereClause($payload['filters'] ?? []);
    if ($whereClause === '') {
        throw new InvalidArgumentException('Az update művelethez kötelező a feltétel.');
    }

    $sets = [];
    $params = [];
    foreach ($updates as $column => $value) {
        $sets[] = sanitizeIdentifier((string)$column) . ' = ?';
        $params[] = $value;
    }

    $sql = sprintf('UPDATE %s SET %s %s', $table, implode(', ', $sets), $whereClause);
    $statement = $pdo->prepare($sql);
    $statement->execute(array_merge($params, $whereParams));

    return ['updatedCount' => $statement->rowCount()];
}

function executeDelete(PDO $pdo, string $table, array $payload)
{
    [$whereClause, $params] = buildWhereClause($payload['filters'] ?? []);
    if ($whereClause === '') {
        throw new InvalidArgumentException('A delete művelethez kötelező a feltétel.');
    }

    $sql = sprintf('DELETE FROM %s %s', $table, $whereClause);
    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    return ['deletedCount' => $statement->rowCount()];
}

function parseColumns($columns): string
{
    if ($columns === null || $columns === '' || $columns === '*') {
        return '*';
    }

    if (is_array($columns)) {
        $list = $columns;
    } else {
        $list = array_map('trim', explode(',', (string)$columns));
    }

    $list = array_filter($list, static fn($item) => $item !== '' && $item !== null);
    if (empty($list)) {
        return '*';
    }

    return implode(', ', array_map('sanitizeIdentifier', $list));
}

function buildWhereClause(array $filters): array
{
    if (empty($filters)) {
        return ['', []];
    }

    $clauses = [];
    $params = [];

    foreach ($filters as $filter) {
        if (!is_array($filter) || empty($filter['type']) || empty($filter['column'])) {
            continue;
        }

        $column = sanitizeIdentifier($filter['column']);

        switch ($filter['type']) {
            case 'eq':
                $clauses[] = $column . ' = ?';
                $params[] = $filter['value'] ?? null;
                break;
            default:
                throw new InvalidArgumentException('Nem támogatott szűrési típus: ' . $filter['type']);
        }
    }

    if (empty($clauses)) {
        return ['', []];
    }

    return ['WHERE ' . implode(' AND ', $clauses), $params];
}

function buildOrderClause(array $order): string
{
    if (empty($order)) {
        return '';
    }

    $parts = [];
    foreach ($order as $rule) {
        if (!is_array($rule) || empty($rule['column'])) {
            continue;
        }

        $direction = (!empty($rule['ascending']) || $rule['ascending'] === null) ? 'ASC' : 'DESC';
        $parts[] = sanitizeIdentifier($rule['column']) . ' ' . $direction;
    }

    if (empty($parts)) {
        return '';
    }

    return 'ORDER BY ' . implode(', ', $parts);
}

function sanitizeIdentifier(string $identifier): string
{
    $identifier = trim($identifier);
    if ($identifier === '*') {
        return '*';
    }

    if (!preg_match('/^([a-zA-Z0-9_]+)(\.[a-zA-Z0-9_]+)*$/', $identifier)) {
        throw new InvalidArgumentException('Érvénytelen azonosító: ' . $identifier);
    }

    $parts = explode('.', $identifier);
    $parts = array_map(static fn($part) => '`' . $part . '`', $parts);

    return implode('.', $parts);
}

if (!function_exists('array_is_list')) {
    function array_is_list(array $array): bool
    {
        $expectedKey = 0;
        foreach ($array as $key => $_) {
            if ($key !== $expectedKey) {
                return false;
            }
            $expectedKey++;
        }
        return true;
    }
}

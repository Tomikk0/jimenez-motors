<?php

declare(strict_types=1);

require_once __DIR__ . '/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed', 405);
}

$payload = read_json_input();

$table = isset($payload['table']) ? allowed_table((string) $payload['table']) : null;
$type = $payload['type'] ?? 'select';
$selectColumns = $payload['select'] ?? '*';
$filters = $payload['filters'] ?? [];
$order = $payload['order'] ?? null;
$limit = isset($payload['limit']) ? normalise_limit($payload['limit']) : null;
$data = $payload['data'] ?? null;
$returning = (bool) ($payload['returning'] ?? false);
$single = (bool) ($payload['single'] ?? false);

if ($table === null) {
    send_error('Table is required');
}

$pdo = Database::getConnection();
$params = [];
$whereClause = build_where_clause(is_array($filters) ? $filters : [], $params);

try {
    switch ($type) {
        case 'select':
            send_json(['data' => run_select($pdo, $table, $selectColumns, $whereClause, $params, $order, $limit, $single)]);
            break;
        case 'insert':
            send_json(['data' => run_insert($pdo, $table, $data, $returning, $selectColumns)]);
            break;
        case 'update':
            send_json(['data' => run_update($pdo, $table, $data, $whereClause, $params, $returning, $selectColumns, is_array($filters) ? $filters : [], $order, $single)]);
            break;
        case 'delete':
            send_json(['data' => run_delete($pdo, $table, $whereClause, $params)]);
            break;
        default:
            send_error('Unsupported query type', 400, ['type' => $type]);
    }
} catch (\PDOException $exception) {
    send_error('Database error', 500, ['message' => $exception->getMessage()]);
}

function run_select(\PDO $pdo, string $table, string $columns, string $whereClause, array $params, ?array $order, ?int $limit, bool $single)
{
    if ($columns !== '*') {
        $sanitizedColumns = array_map('trim', explode(',', $columns));
        $columns = implode(', ', array_map(static function ($column) {
            return '`' . validate_identifier($column) . '`';
        }, $sanitizedColumns));
    }

    $sql = sprintf('SELECT %s FROM `%s`%s', $columns, $table, $whereClause);

    if (is_array($order) && isset($order['column'])) {
        $orderColumn = validate_identifier((string) $order['column']);
        $direction = (isset($order['ascending']) && $order['ascending'] === false) ? 'DESC' : 'ASC';
        $sql .= sprintf(' ORDER BY `%s` %s', $orderColumn, $direction);
    }

    if ($limit !== null) {
        $sql .= ' LIMIT ' . $limit;
    }

    if ($single && $limit === null) {
        $sql .= ' LIMIT 1';
    }

    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    $rows = $statement->fetchAll();

    if ($single) {
        return $rows[0] ?? null;
    }

    return $rows;
}

function run_insert(\PDO $pdo, string $table, $data, bool $returning, string $selectColumns)
{
    if (!is_array($data)) {
        send_error('Insert data must be an array');
    }

    $rows = is_assoc($data) ? [$data] : $data;

    $tableColumns = array_fill_keys(get_table_columns($pdo, $table), true);
    if (empty($tableColumns)) {
        send_error('No columns available for table', 500, ['table' => $table]);
    }

    $insertedIds = [];
    foreach ($rows as $row) {
        if (!is_array($row)) {
            send_error('Each insert row must be an object');
        }

        $filteredRow = array_intersect_key($row, $tableColumns);

        if (empty($filteredRow)) {
            send_error('No valid columns provided for insert', 400, ['table' => $table]);
        }

        $columns = array_keys($filteredRow);
        $placeholders = [];
        $params = [];

        foreach ($columns as $column) {
            $safeColumn = validate_identifier((string) $column);
            $placeholder = ':' . $safeColumn;
            $placeholders[] = $placeholder;
            $params[$placeholder] = normalise_value($filteredRow[$column]);
        }

        $columnList = implode(', ', array_map(static fn ($col) => '`' . validate_identifier((string) $col) . '`', $columns));
        $placeholderList = implode(', ', $placeholders);

        $sql = sprintf('INSERT INTO `%s` (%s) VALUES (%s)', $table, $columnList, $placeholderList);
        $statement = $pdo->prepare($sql);
        $statement->execute($params);

        $insertedIds[] = (int) $pdo->lastInsertId();
    }

    if ($returning) {
        return fetch_rows_by_ids($pdo, $table, $insertedIds, $selectColumns);
    }

    return count($insertedIds);
}

function run_update(\PDO $pdo, string $table, $data, string $whereClause, array $params, bool $returning, string $selectColumns, array $filters, ?array $order, bool $single)
{
    if (!is_array($data)) {
        send_error('Update data must be an object');
    }

    $tableColumns = array_fill_keys(get_table_columns($pdo, $table), true);
    if (empty($tableColumns)) {
        send_error('No columns available for table', 500, ['table' => $table]);
    }

    $filteredData = array_intersect_key($data, $tableColumns);

    if (empty($filteredData)) {
        send_error('No valid columns provided for update', 400, ['table' => $table]);
    }

    $setParts = [];
    foreach ($filteredData as $column => $value) {
        $safeColumn = validate_identifier((string) $column);
        $paramName = ':set_' . $safeColumn;
        $setParts[] = sprintf('`%s` = %s', $safeColumn, $paramName);
        $params[$paramName] = normalise_value($value);
    }

    $sql = sprintf('UPDATE `%s` SET %s%s', $table, implode(', ', $setParts), $whereClause);

    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    if ($returning) {
        $selectParams = [];
        $where = build_where_clause($filters, $selectParams);
        return run_select($pdo, $table, $selectColumns, $where, $selectParams, $order, null, $single);
    }

    return $statement->rowCount();
}

function run_delete(\PDO $pdo, string $table, string $whereClause, array $params)
{
    $sql = sprintf('DELETE FROM `%s`%s', $table, $whereClause);
    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    return $statement->rowCount();
}

function normalise_limit($value): ?int
{
    if (is_int($value)) {
        return $value > 0 ? $value : null;
    }

    if (is_numeric($value)) {
        $integer = (int) $value;
        return $integer > 0 ? $integer : null;
    }

    return null;
}

function fetch_rows_by_ids(\PDO $pdo, string $table, array $ids, string $selectColumns)
{
    if (empty($ids)) {
        return [];
    }

    $placeholders = [];
    $params = [];
    foreach ($ids as $index => $id) {
        $placeholder = ':id_' . $index;
        $placeholders[] = $placeholder;
        $params[$placeholder] = $id;
    }

    $inClause = implode(', ', $placeholders);
    $where = ' WHERE `id` IN (' . $inClause . ')';

    return run_select($pdo, $table, $selectColumns, $where, $params, null, null, false);
}

function is_assoc(array $array): bool
{
    return array_keys($array) !== range(0, count($array) - 1);
}
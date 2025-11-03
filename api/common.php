<?php

declare(strict_types=1);

require_once __DIR__ . '/Database.php';

function send_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($payload);
    exit;
}

function send_error(string $message, int $status = 400, array $context = []): void
{
    send_json([
        'error' => [
            'message' => $message,
            'context' => $context,
        ],
    ], $status);
}

function read_json_input(): array
{
    $raw = file_get_contents('php://input');

    if ($raw === false || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);

    if (!is_array($decoded)) {
        send_error('Invalid JSON payload', 400);
    }

    return $decoded;
}

function validate_identifier(string $name): string
{
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $name)) {
        send_error('Invalid identifier provided', 400, ['identifier' => $name]);
    }

    return $name;
}

function allowed_table(string $table): string
{
    $allowed = [
        'cars',
        'members',
        'member_history',
        'member_badges',
        'badges',
        'app_users',
        'tuning_options',
        'car_models',
        'news',
    ];

    if (!in_array($table, $allowed, true)) {
        send_error('Table not allowed', 403, ['table' => $table]);
    }

    return $table;
}

function build_where_clause(array $filters, array &$params): string
{
    if (empty($filters)) {
        return '';
    }

    $clauses = [];
    foreach ($filters as $index => $filter) {
        if (!is_array($filter) || !isset($filter['column'], $filter['operator'])) {
            send_error('Invalid filter definition', 400);
        }

        $column = validate_identifier((string) $filter['column']);
        $operator = $filter['operator'];

        switch ($operator) {
            case 'eq':
                $value = $filter['value'] ?? null;

                if ($value === null) {
                    $clauses[] = sprintf('`%s` IS NULL', $column);
                    break;
                }

                $paramName = ':filter_' . $index;
                $clauses[] = sprintf('`%s` = %s', $column, $paramName);
                $params[$paramName] = normalise_value($value);
                break;
            default:
                send_error('Unsupported operator', 400, ['operator' => $operator]);
        }
    }

    return ' WHERE ' . implode(' AND ', $clauses);
}

function normalise_value($value)
{
    if (is_bool($value)) {
        return $value ? 1 : 0;
    }

    if ($value instanceof DateTimeInterface) {
        return $value->format('Y-m-d H:i:s');
    }

    if (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $value)) {
        $date = date_create($value);
        if ($date !== false) {
            return $date->format('Y-m-d H:i:s');
        }
    }

    return $value;
}

function get_table_columns(\PDO $pdo, string $table): array
{
    static $cache = [];

    if (isset($cache[$table])) {
        return $cache[$table];
    }

    $safeTable = validate_identifier($table);
    $query = sprintf('SHOW COLUMNS FROM `%s`', $safeTable);
    $statement = $pdo->query($query);

    if ($statement === false) {
        send_error('Unable to inspect table columns', 500, ['table' => $table]);
    }

    $columns = $statement->fetchAll(\PDO::FETCH_COLUMN);

    if (!is_array($columns)) {
        send_error('Unable to load table columns', 500, ['table' => $table]);
    }

    $cache[$table] = array_map('strval', $columns);

    return $cache[$table];
}
<?php

declare(strict_types=1);

require_once __DIR__ . '/common.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    send_error('Method not allowed', 405);
}

try {
    $pdo = Database::getConnection();

    $carsStatement = $pdo->prepare(
        'SELECT id, model, tuning, purchase_price, desired_price, sale_price, sold, added_by, image_url, image_data_url, sold_by, sold_at, created_at '
        . 'FROM `cars`
          WHERE `is_gallery` = 0 AND `sold` = 0
          ORDER BY `created_at` DESC'
    );
    $carsStatement->execute();
    $cars = $carsStatement->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $membersStatement = $pdo->query(
        'SELECT id, name, phone, rank, created_at
           FROM `members`
           ORDER BY `name`'
    );
    $members = $membersStatement !== false ? $membersStatement->fetchAll(PDO::FETCH_ASSOC) : [];

    $tuningStatement = $pdo->query('SELECT name FROM `tuning_options` ORDER BY `name`');
    $tuningOptions = $tuningStatement !== false ? $tuningStatement->fetchAll(PDO::FETCH_COLUMN) : [];

    $modelsStatement = $pdo->query('SELECT name FROM `car_models` ORDER BY `name`');
    $modelOptions = $modelsStatement !== false ? $modelsStatement->fetchAll(PDO::FETCH_COLUMN) : [];

    send_json([
        'data' => [
            'cars' => $cars,
            'members' => array_map(static function ($row) {
                return [
                    'id' => isset($row['id']) ? (int) $row['id'] : null,
                    'name' => $row['name'] ?? null,
                    'phone' => $row['phone'] ?? null,
                    'rank' => $row['rank'] ?? null,
                    'created_at' => $row['created_at'] ?? null,
                ];
            }, is_array($members) ? $members : []),
            'tuningOptions' => array_values(array_filter(array_map('strval', is_array($tuningOptions) ? $tuningOptions : []))),
            'modelOptions' => array_values(array_filter(array_map('strval', is_array($modelOptions) ? $modelOptions : []))),
        ],
    ]);
} catch (PDOException $exception) {
    send_error('Database error', 500, ['message' => $exception->getMessage()]);
}

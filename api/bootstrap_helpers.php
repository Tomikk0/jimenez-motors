<?php

declare(strict_types=1);

require_once __DIR__ . '/Database.php';

const BOOTSTRAP_CACHE_KEY = 'bootstrap';
const BOOTSTRAP_CACHE_TTL_SECONDS = 60;
const BOOTSTRAP_CACHE_STALE_GRACE_SECONDS = 240;

/**
 * Fetch the bootstrap payload from the database.
 */
function fetch_bootstrap_payload(): array
{
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

    $newsStatement = $pdo->query(
        'SELECT id, title, content, created_by, created_at'
        . ' FROM `news`
          ORDER BY `created_at` DESC
          LIMIT 12'
    );
    $newsRows = $newsStatement !== false ? $newsStatement->fetchAll(PDO::FETCH_ASSOC) : [];

    return [
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
        'news' => array_map(static function ($row) {
            return [
                'id' => isset($row['id']) ? (int) $row['id'] : null,
                'title' => $row['title'] ?? null,
                'content' => $row['content'] ?? null,
                'created_by' => $row['created_by'] ?? null,
                'created_at' => $row['created_at'] ?? null,
            ];
        }, is_array($newsRows) ? $newsRows : []),
    ];
}

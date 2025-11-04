<?php

declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/cache.php';
require_once __DIR__ . '/Database.php';

const CAR_IMAGE_CACHE_PREFIX = 'car_image_';
const CAR_IMAGE_CACHE_TTL_SECONDS = 600;

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    send_error('Method not allowed', 405);
}

$rawId = $_GET['id'] ?? $_GET['car_id'] ?? null;

if ($rawId === null || $rawId === '') {
    send_error('Hiányzó azonosító', 400);
}

if (!is_numeric($rawId)) {
    send_error('Érvénytelen azonosító', 400);
}

$carId = (int) $rawId;

if ($carId <= 0) {
    send_error('Érvénytelen azonosító', 400);
}

$cacheKey = CAR_IMAGE_CACHE_PREFIX . $carId;
$cachedEntry = cache_get_with_timestamp($cacheKey);
$cachedData = null;
$cachedTimestamp = null;

if (is_array($cachedEntry)) {
    $cachedData = is_array($cachedEntry['data'] ?? null) ? $cachedEntry['data'] : null;
    $cachedTimestamp = $cachedEntry['timestamp'] ?? null;

    if ($cachedData !== null) {
        $age = $cachedTimestamp !== null ? time() - $cachedTimestamp : null;
        if ($age === null || $age <= CAR_IMAGE_CACHE_TTL_SECONDS) {
            header('Cache-Control: private, max-age=' . CAR_IMAGE_CACHE_TTL_SECONDS);
            header('X-Car-Image-Cache: hit');
            send_json(['data' => normalize_car_image_payload($carId, $cachedData)]);
        }
    }
}

try {
    $pdo = Database::getConnection();

    $statement = $pdo->prepare(
        'SELECT image_data_url, image_url, updated_at FROM `cars` WHERE `id` = :id LIMIT 1'
    );
    $statement->execute([':id' => $carId]);

    $row = $statement->fetch(PDO::FETCH_ASSOC);

    if ($row === false) {
        send_error('Az autó nem található', 404);
    }

    $imageDataUrl = isset($row['image_data_url']) && is_string($row['image_data_url'])
        ? trim($row['image_data_url'])
        : '';
    $imageUrl = isset($row['image_url']) && is_string($row['image_url'])
        ? trim($row['image_url'])
        : '';

    $payload = [
        'car_id' => $carId,
        'image_data_url' => $imageDataUrl !== '' ? $row['image_data_url'] : null,
        'image_url' => $imageUrl !== '' ? $row['image_url'] : null,
        'image_cache_key' => 'car-' . $carId,
        'image_updated_at' => $row['updated_at'] ?? null,
        'has_image_data_url' => $imageDataUrl !== '',
    ];

    if ($payload['image_data_url'] !== null) {
        cache_set($cacheKey, $payload);
    } elseif ($imageDataUrl === '' && $cachedData !== null) {
        // The image was removed, ensure the cache is cleared so stale data is not reused.
        @unlink(cache_path($cacheKey));
    }

    header('Cache-Control: private, max-age=' . CAR_IMAGE_CACHE_TTL_SECONDS);
    header('X-Car-Image-Cache: miss');
    send_json(['data' => $payload]);
} catch (Throwable $exception) {
    if (is_array($cachedData)) {
        header('Cache-Control: private, max-age=' . CAR_IMAGE_CACHE_TTL_SECONDS);
        header('X-Car-Image-Cache: stale-error');
        send_json([
            'data' => normalize_car_image_payload($carId, $cachedData),
            'meta' => [
                'cacheStatus' => 'stale-error',
                'message' => 'A kép betöltése nem sikerült, gyorsítótárból szolgálva.',
            ],
        ]);
    }

    error_log(sprintf(
        '[car_image] %s: %s in %s on line %d',
        get_class($exception),
        $exception->getMessage(),
        $exception->getFile(),
        $exception->getLine()
    ));

    send_error('Nem sikerült lekérni a képet', 500);
}

function normalize_car_image_payload(int $carId, array $payload): array
{
    $imageDataUrl = isset($payload['image_data_url']) && is_string($payload['image_data_url'])
        ? trim($payload['image_data_url'])
        : '';
    $imageUrl = isset($payload['image_url']) && is_string($payload['image_url'])
        ? trim($payload['image_url'])
        : '';

    return [
        'car_id' => $carId,
        'image_data_url' => $imageDataUrl !== '' ? $payload['image_data_url'] : null,
        'image_url' => $imageUrl !== '' ? $payload['image_url'] : null,
        'image_cache_key' => isset($payload['image_cache_key']) && is_string($payload['image_cache_key'])
            ? $payload['image_cache_key']
            : 'car-' . $carId,
        'image_updated_at' => $payload['image_updated_at'] ?? null,
        'has_image_data_url' => $imageDataUrl !== '',
    ];
}

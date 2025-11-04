<?php

declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/cache.php';
require_once __DIR__ . '/bootstrap_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    send_error('Method not allowed', 405);
}

$cachedEntry = cache_get_with_timestamp(BOOTSTRAP_CACHE_KEY);
$cachedData = null;
$cachedAge = null;

if (is_array($cachedEntry)) {
    $timestamp = $cachedEntry['timestamp'] ?? null;
    $cachedData = $cachedEntry['data'] ?? null;
    $cachedAge = $timestamp ? time() - $timestamp : null;
}

try {
    if (is_array($cachedData)) {
        if ($cachedAge !== null && $cachedAge <= BOOTSTRAP_CACHE_TTL_SECONDS) {
            header('X-Bootstrap-Cache: hit');
            send_json(['data' => $cachedData]);
        }

        if ($cachedAge === null || $cachedAge <= BOOTSTRAP_CACHE_TTL_SECONDS + BOOTSTRAP_CACHE_STALE_GRACE_SECONDS) {
            header('X-Bootstrap-Cache: stale');
            refresh_bootstrap_cache_in_background();
            send_json(['data' => $cachedData]);
        }
    }

    $payload = fetch_bootstrap_payload();
    cache_set(BOOTSTRAP_CACHE_KEY, $payload);

    header('X-Bootstrap-Cache: miss');
    send_json(['data' => $payload]);
} catch (\Throwable $exception) {
    if (is_array($cachedData)) {
        header('X-Bootstrap-Cache: stale-error');
        refresh_bootstrap_cache_in_background();
        send_json([
            'data' => $cachedData,
            'meta' => [
                'cacheStatus' => 'stale-error',
                'message' => 'A bootstrap adatok frissítése nem sikerült, gyorsítótárból szolgálva.',
            ],
        ]);
    }

    $isDatabaseError = $exception instanceof \PDOException;
    $meta = [
        'cacheStatus' => 'empty-fallback',
        'message' => 'A bootstrap adatok nem érhetők el, ideiglenes üres készlet szolgálva.',
    ];

    if ($isDatabaseError) {
        $meta['reason'] = 'database-error';
    } else {
        $meta['reason'] = 'internal-error';
    }

    error_log(sprintf(
        '[bootstrap] %s: %s in %s on line %d',
        get_class($exception),
        $exception->getMessage(),
        $exception->getFile(),
        $exception->getLine()
    ));

    header('X-Bootstrap-Cache: empty-fallback');
    send_json([
        'data' => empty_bootstrap_payload(),
        'meta' => $meta,
    ]);
}

function refresh_bootstrap_cache_in_background(): void
{
    static $launched = false;

    if ($launched) {
        return;
    }

    $launched = true;

    $script = realpath(__DIR__ . '/../scripts/refresh_bootstrap_cache.php');

    if ($script === false || !is_file($script) || !is_readable($script)) {
        return;
    }

    $lockPath = CACHE_DIRECTORY . '/bootstrap.refresh.lock';
    $lockLifetime = 30;
    $now = time();

    if (is_file($lockPath)) {
        $modifiedAt = filemtime($lockPath);
        if ($modifiedAt !== false && ($now - $modifiedAt) < $lockLifetime) {
            return;
        }
    }

    $handle = @fopen($lockPath, 'c+');

    if ($handle === false) {
        return;
    }

    if (!flock($handle, LOCK_EX | LOCK_NB)) {
        fclose($handle);
        return;
    }

    ftruncate($handle, 0);
    fwrite($handle, (string) $now);
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    $command = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($script);

    if (stripos(PHP_OS, 'WIN') === 0) {
        if (!is_function_available('popen') || !is_function_available('pclose')) {
            return;
        }

        @pclose(@popen('start /B ' . $command, 'r'));
    } else {
        if (!is_function_available('exec')) {
            return;
        }

        @exec($command . ' > /dev/null 2>&1 &');
    }
}

function is_function_available(string $name): bool
{
    if (!function_exists($name)) {
        return false;
    }

    $disabled = ini_get('disable_functions');

    if (!is_string($disabled) || trim($disabled) === '') {
        return true;
    }

    $list = array_map('trim', explode(',', $disabled));

    return !in_array($name, $list, true);
}

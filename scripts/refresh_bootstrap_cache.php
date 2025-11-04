<?php

declare(strict_types=1);

require_once __DIR__ . '/../api/bootstrap_helpers.php';
require_once __DIR__ . '/../api/cache.php';

$lockPath = CACHE_DIRECTORY . '/bootstrap.refresh.lock';
$handle = @fopen($lockPath, 'c+');

if ($handle === false) {
    exit(0);
}

if (!flock($handle, LOCK_EX | LOCK_NB)) {
    fclose($handle);
    exit(0);
}

try {
    $payload = fetch_bootstrap_payload();
    cache_set(BOOTSTRAP_CACHE_KEY, $payload);
} catch (Throwable $throwable) {
    // The refresh failure is ignored; the next request can retry.
} finally {
    flock($handle, LOCK_UN);
    fclose($handle);
    @unlink($lockPath);
}

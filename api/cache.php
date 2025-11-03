<?php

declare(strict_types=1);

const CACHE_DIRECTORY = __DIR__ . '/../database/cache';

/**
 * Return the full path to the cache file for the provided key.
 */
function cache_path(string $key): string
{
    $safeKey = preg_replace('/[^a-zA-Z0-9_-]/', '_', $key);

    return rtrim(CACHE_DIRECTORY, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $safeKey . '.json';
}

/**
 * Attempt to read a cache entry and return its decoded payload.
 */
function cache_get(string $key, int $ttlSeconds)
{
    if ($ttlSeconds <= 0) {
        return null;
    }

    $path = cache_path($key);

    if (!is_file($path) || !is_readable($path)) {
        return null;
    }

    $modifiedAt = filemtime($path);

    if ($modifiedAt === false || (time() - $modifiedAt) > $ttlSeconds) {
        return null;
    }

    $contents = file_get_contents($path);

    if ($contents === false || $contents === '') {
        return null;
    }

    $decoded = json_decode($contents, true);

    return is_array($decoded) ? $decoded : null;
}

/**
 * Persist the payload to the cache. Failures are silently ignored so the caller
 * can still return a fresh response.
 */
function cache_set(string $key, array $payload): void
{
    $path = cache_path($key);
    $directory = dirname($path);

    if (!is_dir($directory)) {
        if (!mkdir($directory, 0775, true) && !is_dir($directory)) {
            return;
        }
    }

    $json = json_encode($payload);

    if ($json === false) {
        return;
    }

    file_put_contents($path, $json, LOCK_EX);
}

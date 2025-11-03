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

    $entry = cache_get_with_timestamp($key);

    if ($entry === null) {
        return null;
    }

    $timestamp = $entry['timestamp'] ?? null;

    if ($timestamp === null) {
        return null;
    }

    if ((time() - $timestamp) > $ttlSeconds) {
        return null;
    }

    return $entry['data'] ?? null;
}

/**
 * Return the cache payload along with its last modified timestamp.
 */
function cache_get_with_timestamp(string $key): ?array
{
    $path = cache_path($key);

    if (!is_file($path) || !is_readable($path)) {
        return null;
    }

    $contents = file_get_contents($path);

    if ($contents === false || $contents === '') {
        return null;
    }

    $decoded = json_decode($contents, true);

    if (!is_array($decoded)) {
        return null;
    }

    $modifiedAt = filemtime($path);

    return [
        'data' => $decoded,
        'timestamp' => $modifiedAt === false ? null : (int) $modifiedAt,
    ];
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

    $options = JSON_UNESCAPED_UNICODE;
    if (defined('JSON_INVALID_UTF8_SUBSTITUTE')) {
        $options |= JSON_INVALID_UTF8_SUBSTITUTE;
    }

    $json = json_encode($payload, $options);

    if ($json === false) {
        return;
    }

    file_put_contents($path, $json, LOCK_EX);
}

<?php

return [
    'host' => getenv('DB_HOST') ?: '127.0.0.1',
    'port' => getenv('DB_PORT') ?: '3306',
    'database' => getenv('DB_DATABASE') ?: 'jimenez_motors',
    'username' => getenv('DB_USERNAME') ?: 'root',
    'password' => getenv('DB_PASSWORD') ?: '',
    'charset' => 'utf8mb4',
    'column_aliases' => [
        // Példa aliasok: a bal oldalon a frontend által használt oszlopnév,
        // a jobb oldalon az adatbázisban ténylegesen létező oszlop.
        // 'members' => [
        //     'name' => 'nev',
        //     'created_at' => 'letrehozva'
        // ],
    ],
];

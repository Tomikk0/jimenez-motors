<?php
return [
    // InfinityFree esetén másold át ezt a fájlt `config.php` néven,
    // majd töltsd ki a saját tárhelyed adataival.
    'host' => 'sqlxxx.infinityfree.com',
    'username' => 'your_db_username',
    'password' => 'your_db_password',
    'database' => 'your_database_name',
    'port' => 3306,
    'charset' => 'utf8mb4',
    // Ha korlátozni szeretnéd a CORS-t, add meg a megengedett domaineket.
    // Használj '*' értéket, ha bármilyen originről engedélyezni szeretnéd a kéréseket.
    'allowed_origins' => ['*'],
];

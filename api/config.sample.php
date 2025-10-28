<?php
return [
    // Másold át ezt a fájlt `config.php` néven,
    // majd töltsd ki a saját VPS-ed / tárhelyed adataival.
    'host' => '127.0.0.1',
    'username' => 'your_db_username',
    'password' => 'your_db_password',
    'database' => 'your_database_name',
    'port' => 3306,
    'charset' => 'utf8mb4',
    // Ha a MariaDB szerverhez unix socketen keresztül csatlakozol,
    // add meg a socket elérési útvonalát (pl. '/run/mysqld/mysqld.sock').
    // Hagyhatod üresen, ha TCP-n keresztül csatlakozol a host/port párossal.
    'socket' => '',
    // További PDO beállításokat is adhatsz (pl. SSL, persistens kapcsolat stb.).
    'options' => [
        // PDO::MYSQL_ATTR_SSL_CA => '/path/to/ca.pem',
    ],
    // Ha korlátozni szeretnéd a CORS-t, add meg a megengedett domaineket.
    // Használj '*' értéket, ha bármilyen originről engedélyezni szeretnéd a kéréseket.
    'allowed_origins' => ['*'],
];

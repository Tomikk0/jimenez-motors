-- MariaDB schema for Jimenez Motors application
CREATE TABLE IF NOT EXISTS cars (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    model VARCHAR(120) NOT NULL,
    tuning TEXT NULL,
    purchase_price INT NULL,
    desired_price INT NULL,
    sale_price INT NULL,
    net_sale_price INT NULL,
    tax_amount INT NULL,
    sale_type VARCHAR(16) NULL,
    base_price INT NULL,
    added_by VARCHAR(120) NULL,
    sold TINYINT(1) NOT NULL DEFAULT 0,
    sold_by VARCHAR(120) NULL,
    sold_at DATETIME NULL,
    image_url TEXT NULL,
    image_data_url LONGTEXT NULL,
    is_gallery TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cars_sold (sold),
    INDEX idx_cars_gallery (is_gallery),
    INDEX idx_cars_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS members (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    rank VARCHAR(120) NULL,
    phone VARCHAR(64) NULL,
    created_by VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_members_rank (rank)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS member_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    member_name VARCHAR(120) NOT NULL,
    action VARCHAR(32) NOT NULL,
    reason TEXT NULL,
    performed_by VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_member_history_member (member_name),
    INDEX idx_member_history_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS member_badges (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    member_name VARCHAR(120) NOT NULL,
    badge_name VARCHAR(120) NOT NULL,
    badge_color VARCHAR(32) NULL,
    description TEXT NULL,
    created_by VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_member_badges_member (member_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    member_name VARCHAR(120) NULL,
    role ENUM('admin','user') NOT NULL DEFAULT 'user',
    rank VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_app_users_member (member_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tuning_options (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    price INT NULL,
    pp_price INT NULL,
    created_by VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tuning_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS car_models (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS badges (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rank VARCHAR(120) NOT NULL UNIQUE,
    note TEXT NULL,
    updated_by VARCHAR(120) NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

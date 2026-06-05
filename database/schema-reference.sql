-- Reference schema for MySQL migration (adapt types and syntax as needed).
-- Run the whole file in MySQL Workbench (creates DB + tables).

CREATE DATABASE IF NOT EXISTS tablebite
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tablebite;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  category ENUM('starters', 'mains', 'drinks', 'desserts') NOT NULL,
  image_url VARCHAR(512) NULL,
  emoji VARCHAR(16) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL UNIQUE,
  order_number VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(32) NOT NULL DEFAULT 'pending_payment',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  payment_method ENUM('gcash', 'cash') NOT NULL,
  order_type ENUM('dine_in', 'pickup') NOT NULL DEFAULT 'dine_in',
  table_number VARCHAR(4) NULL,
  cutlery TINYINT(1) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10, 2) NOT NULL,
  grand_total DECIMAL(10, 2) NOT NULL,
  customer_name VARCHAR(255) NOT NULL DEFAULT '',
  contact_number VARCHAR(64) NOT NULL DEFAULT '',
  notes TEXT NOT NULL,
  `lines` JSON NOT NULL,
  ready_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  INDEX orders_created_at_idx (created_at),
  INDEX orders_ready_at_idx (ready_at),
  INDEX orders_completed_at_idx (completed_at)
);

CREATE TABLE IF NOT EXISTS table_visits (
  table_number VARCHAR(4) PRIMARY KEY,
  is_open TINYINT(1) NOT NULL DEFAULT 0,
  opened_at TIMESTAMP NULL,
  closed_at TIMESTAMP NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX table_visits_is_open_idx (is_open)
);

-- Device-bound guest sessions after a table QR scan (production anti-sharing).
CREATE TABLE IF NOT EXISTS guest_qr_sessions (
  session_id VARCHAR(64) PRIMARY KEY,
  table_number VARCHAR(4) NOT NULL,
  visit_opened_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX guest_sessions_table_idx (table_number),
  INDEX guest_sessions_expires_idx (expires_at)
);

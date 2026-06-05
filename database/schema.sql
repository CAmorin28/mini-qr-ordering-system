-- TableBite MySQL schema + seed data (single source of truth)
-- Run the entire file in MySQL Workbench on a new or existing database.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS and upserts sample menu rows.

CREATE DATABASE IF NOT EXISTS tablebite
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tablebite;

-- Remove legacy QR tables from older project versions (no-op if already gone).
DROP TABLE IF EXISTS guest_qr_sessions;
DROP TABLE IF EXISTS table_visits;
DROP TABLE IF EXISTS table_qr_sessions;

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
  table_number VARCHAR(1) NULL,
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
  INDEX orders_completed_at_idx (completed_at)
);

-- Per-table visit cycle (staff open / close for guests).
CREATE TABLE IF NOT EXISTS table_qr_visits (
  table_number VARCHAR(1) PRIMARY KEY,
  is_open TINYINT(1) NOT NULL DEFAULT 0,
  session_generation BIGINT UNSIGNED NOT NULL DEFAULT 0,
  opened_at TIMESTAMP NULL,
  closed_at TIMESTAMP NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX table_qr_visits_open_idx (is_open)
);

-- One active device session per table (device_id + table_number).
CREATE TABLE IF NOT EXISTS qr_sessions (
  table_number VARCHAR(1) PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  device_id VARCHAR(64) NOT NULL,
  session_generation BIGINT UNSIGNED NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY qr_sessions_session_id_idx (session_id),
  INDEX qr_sessions_device_idx (device_id),
  INDEX qr_sessions_expires_idx (expires_at),
  INDEX qr_sessions_updated_idx (updated_at)
);

-- Historical log when a QR session ends.
CREATE TABLE IF NOT EXISTS qr_ended_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_number VARCHAR(1) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  device_id VARCHAR(64) NOT NULL,
  session_generation BIGINT UNSIGNED NOT NULL,
  end_reason ENUM(
    'expired',
    'released',
    'table_closed',
    'new_guests'
  ) NOT NULL,
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX qr_ended_table_idx (table_number),
  INDEX qr_ended_ended_at_idx (ended_at),
  INDEX qr_ended_device_idx (device_id)
);

-- Sample menu (safe to re-run)
INSERT INTO products (id, name, price, category, image_url, emoji) VALUES
  ('caesar-salad', 'Caesar Salad', 12.00, 'starters',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuAB8lyLU1zpvvTcsDkvGknCcyjyKGG93FZ80pvh6QLL6wzEYIxUHZpWGwstiitRy2ZDmYC-GzUeo8jjQUgcixGbsGRhR-I9gwQZbxWKvo_4BFqvnWT4Scl0ZcS4e0fVNbydhn8O4AMEMH88TvKv48x6P0__FWJVt90xFX2y2egC-wZTmVJFTlHKx5u6CSGG0eEHSjDAAiMrLJrGS5d0elmRZSwqOqAyQPAYk58Do6N0HE2U052yBn9g_jfDH34-lrJDgFKG7EnQtxk',
   NULL),
  ('grilled-ribs', 'Grilled Ribs', 35.00, 'mains',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDuHw4XNHR9BNOFNQVdhA34r7DhEDBy0-0DtLbTiJ-NBNeUfw41U6yCqL3KksgHD_tp3P67TOlQDLtpUzwQOvFFTm5ncJE-GZ2KMtPfFavoqj7CxukL6R5G3MJge4CZDS8bNZxQ2xOpXWLhe33FPaq0wj6_Ud2p3DpBcXlmlQjeS8wrvugDta0IWsiSeT3vHWK9smBdzokf4IoYDEVBkr06BN0P3dz5jpdav8p0-uuQNl6usdclomN0SYs-NsM9SEnBfbbckx40PSY',
   NULL),
  ('ramen-bowl', 'Ramen Bowl', 22.00, 'mains',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuC14WIi9zFycO5TlAwGstf-Y15T8cC2hLu1loa9kILr3ty96DvNdxtSpQ2PhagnZUD5GCTqJC6Elu6WD-GE2ZmMZupnE37Kquq5Xcx-NR4uDGB4MyfDkLTF9susACcb04B7wVwnrLon_m8YXOXPouvQASpyT3xmWpMlJ-y86gV_eRaTlTkFuv6baFLaoVwzcYkrRSk7tySb5SljCl7D_MOij-n3rrUeWclWklbzeoQcaXC_zgi-ksGqNGwEuHH8wEyiRqc0zkW4B6I',
   NULL),
  ('lemon-iced-tea', 'Lemon Iced Tea', 6.00, 'drinks',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDhYcBWOQkENz6ikkkBkkM235K29Dx5aGfyxRloBoE9tFVsiKHDkf_mm-nbm3x3g-_hDLC3zGim2gJF3TkalCp20sLR2AS3BZ8VZq5g_uL2pop5HMrBqEgrsg8qBPainxbNbKpWFqAmjWRbJC_i4roxrZ-9V9FOXcmDC8FKiPvWIMnfeNUiauLhITY7TFuSyUKxTuBN-t4tJr--QNQH0uJdmyBcwhNsUd5GXp1qlMFzxDMwSxOCykqPfz_U-BCuceXJ2XqGyQ-dick',
   NULL),
  ('classic-burger', 'Classic Burger', 18.00, 'mains', NULL, '🍔'),
  ('french-fries', 'French Fries', 9.00, 'starters', NULL, '🍟'),
  ('chocolate-cake', 'Chocolate Cake', 14.00, 'desserts', NULL, '🍰')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  price = VALUES(price),
  category = VALUES(category),
  image_url = VALUES(image_url),
  emoji = VALUES(emoji);


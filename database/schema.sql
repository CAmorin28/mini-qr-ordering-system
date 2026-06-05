-- TableBite MySQL schema + seed data
-- Run the whole file in MySQL Workbench (creates DB, tables, and sample menu).

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

-- Migration: add username, passwordHash, status to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS username VARCHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS passwordHash TEXT,
  ADD COLUMN IF NOT EXISTS status ENUM('active', 'pending', 'rejected') NOT NULL DEFAULT 'active';
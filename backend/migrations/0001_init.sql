PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tours (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('railway', 'sightseeing', 'festival', 'local', 'theme')),
  region_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'ended')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stamp_spots (
  id TEXT PRIMARY KEY,
  tour_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  lat REAL,
  lng REAL,
  operation_hours TEXT,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('manual', 'gps', 'qr', 'photo')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tour_id) REFERENCES tours(id)
);

CREATE INDEX IF NOT EXISTS idx_tours_region_status_updated
  ON tours (region_code, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_stamp_spots_tour
  ON stamp_spots (tour_id, created_at DESC);

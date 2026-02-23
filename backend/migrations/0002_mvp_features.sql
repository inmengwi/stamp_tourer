PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tour_participations (
  id TEXT PRIMARY KEY,
  tour_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  joined_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (tour_id, user_id)
);

CREATE TABLE IF NOT EXISTS tour_wishlist (
  id TEXT PRIMARY KEY,
  tour_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (tour_id, user_id)
);

CREATE TABLE IF NOT EXISTS stamp_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tour_id TEXT NOT NULL,
  spot_id TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('manual', 'gps', 'qr', 'photo')),
  memo TEXT,
  acquired_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  FOREIGN KEY (spot_id) REFERENCES stamp_spots(id),
  UNIQUE (user_id, spot_id, acquired_at)
);

CREATE INDEX IF NOT EXISTS idx_tour_participations_user_status
  ON tour_participations (user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tour_wishlist_user
  ON tour_wishlist (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_stamp_records_user_acquired
  ON stamp_records (user_id, acquired_at DESC);

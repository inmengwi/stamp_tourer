PRAGMA foreign_keys = ON;

ALTER TABLE tours ADD COLUMN difficulty TEXT;
ALTER TABLE tours ADD COLUMN duration TEXT;
ALTER TABLE tours ADD COLUMN budget TEXT;
ALTER TABLE tours ADD COLUMN period TEXT;
ALTER TABLE tours ADD COLUMN reward TEXT;
ALTER TABLE tours ADD COLUMN estimated_hours REAL;
ALTER TABLE tours ADD COLUMN estimated_cost INTEGER;
ALTER TABLE tours ADD COLUMN organizer TEXT;
ALTER TABLE tours ADD COLUMN target_audience TEXT;
ALTER TABLE tours ADD COLUMN thumbnail_emoji TEXT;
ALTER TABLE tours ADD COLUMN participants INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tours ADD COLUMN review_score REAL;

CREATE TABLE IF NOT EXISTS tour_spots (
  id TEXT PRIMARY KEY,
  tour_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  lat REAL,
  lng REAL,
  operation_hours TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tour_id) REFERENCES tours(id)
);

CREATE TABLE IF NOT EXISTS tour_milestones (
  id TEXT PRIMARY KEY,
  tour_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward TEXT,
  target_count INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tour_id) REFERENCES tours(id)
);

CREATE TABLE IF NOT EXISTS tour_notices (
  id TEXT PRIMARY KEY,
  tour_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  starts_at INTEGER,
  ends_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tour_id) REFERENCES tours(id)
);

CREATE TABLE IF NOT EXISTS tour_verification_methods (
  id TEXT PRIMARY KEY,
  tour_id TEXT NOT NULL,
  spot_id TEXT,
  method TEXT NOT NULL CHECK (method IN ('manual', 'gps', 'qr', 'photo')),
  details TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  FOREIGN KEY (spot_id) REFERENCES tour_spots(id)
);

CREATE TABLE IF NOT EXISTS tour_tags (
  id TEXT PRIMARY KEY,
  tour_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  UNIQUE (tour_id, tag)
);

ALTER TABLE tour_participations ADD COLUMN completed_at INTEGER;

CREATE TABLE IF NOT EXISTS wishlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tour_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  UNIQUE (user_id, tour_id)
);

CREATE INDEX IF NOT EXISTS idx_tour_spots_tour_created
  ON tour_spots (tour_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tour_milestones_tour_order
  ON tour_milestones (tour_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_tour_notices_tour_created
  ON tour_notices (tour_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tour_verification_methods_tour_method
  ON tour_verification_methods (tour_id, method);

CREATE INDEX IF NOT EXISTS idx_tour_tags_tour_created
  ON tour_tags (tour_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tour_participations_user_tour
  ON tour_participations (user_id, tour_id);

CREATE INDEX IF NOT EXISTS idx_tour_participations_tour_joined
  ON tour_participations (tour_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_tour
  ON wishlists (user_id, tour_id);

CREATE INDEX IF NOT EXISTS idx_wishlists_tour_created
  ON wishlists (tour_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stamp_records_user_tour
  ON stamp_records (user_id, tour_id);

CREATE INDEX IF NOT EXISTS idx_stamp_records_tour_created
  ON stamp_records (tour_id, created_at DESC);

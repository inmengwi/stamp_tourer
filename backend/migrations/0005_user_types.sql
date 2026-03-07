-- Migrate role values: 'user' -> 'tourer', and update CHECK constraint.
--
-- D1 enforces FK constraints after every DDL statement and does not allow
-- PRAGMA foreign_keys = OFF (or defer_foreign_keys) to override this.
-- Therefore we must keep FK integrity valid at every step:
--   1. Back up child tables that FK-reference users (backup has no constraints).
--   2. Drop those child tables  → no FK references to users remain in schema.
--   3. Recreate users with the new CHECK constraint, converting data.
--   4. Recreate child tables with FK constraints pointing at the new users.
--   5. Restore data and rebuild indexes.

-- ── 1. Back up every table that has FOREIGN KEY … REFERENCES users(id) ──────

CREATE TABLE tour_participations_bak AS SELECT * FROM tour_participations;
CREATE TABLE tour_wishlist_bak       AS SELECT * FROM tour_wishlist;
CREATE TABLE stamp_records_bak       AS SELECT * FROM stamp_records;
CREATE TABLE wishlists_bak           AS SELECT * FROM wishlists;
CREATE TABLE spot_schedules_bak      AS SELECT * FROM spot_schedules;

-- ── 2. Drop child tables (this removes all FK references to users) ───────────

DROP TABLE spot_schedules;
DROP TABLE wishlists;
DROP TABLE stamp_records;
DROP TABLE tour_wishlist;
DROP TABLE tour_participations;

-- ── 3. Recreate users with updated CHECK constraint ──────────────────────────

CREATE TABLE users_new (
  id            TEXT    PRIMARY KEY,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  nickname      TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK (role IN ('tourer', 'admin')),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

INSERT INTO users_new
  SELECT id, email, password_hash, nickname,
    CASE WHEN role = 'user' THEN 'tourer' ELSE role END,
    created_at, updated_at
  FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- ── 4. Recreate child tables with FK constraints ─────────────────────────────

CREATE TABLE tour_participations (
  id           TEXT    PRIMARY KEY,
  tour_id      TEXT    NOT NULL,
  user_id      TEXT    NOT NULL,
  status       TEXT    NOT NULL CHECK (status IN ('active', 'completed')),
  joined_at    INTEGER NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (tour_id, user_id)
);

INSERT INTO tour_participations
  (id, tour_id, user_id, status, joined_at, created_at, updated_at, completed_at)
  SELECT id, tour_id, user_id, status, joined_at, created_at, updated_at, completed_at
  FROM tour_participations_bak;

DROP TABLE tour_participations_bak;

CREATE TABLE tour_wishlist (
  id         TEXT    PRIMARY KEY,
  tour_id    TEXT    NOT NULL,
  user_id    TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (tour_id, user_id)
);

INSERT INTO tour_wishlist (id, tour_id, user_id, created_at, updated_at)
  SELECT id, tour_id, user_id, created_at, updated_at
  FROM tour_wishlist_bak;

DROP TABLE tour_wishlist_bak;

CREATE TABLE stamp_records (
  id          TEXT    PRIMARY KEY,
  user_id     TEXT    NOT NULL,
  tour_id     TEXT    NOT NULL,
  spot_id     TEXT    NOT NULL,
  method      TEXT    NOT NULL CHECK (method IN ('manual', 'gps', 'qr', 'photo')),
  memo        TEXT,
  acquired_at INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  FOREIGN KEY (spot_id) REFERENCES stamp_spots(id),
  UNIQUE (user_id, spot_id, acquired_at)
);

INSERT INTO stamp_records
  (id, user_id, tour_id, spot_id, method, memo, acquired_at, created_at, updated_at)
  SELECT id, user_id, tour_id, spot_id, method, memo, acquired_at, created_at, updated_at
  FROM stamp_records_bak;

DROP TABLE stamp_records_bak;

CREATE TABLE wishlists (
  id         TEXT    PRIMARY KEY,
  user_id    TEXT    NOT NULL,
  tour_id    TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  UNIQUE (user_id, tour_id)
);

INSERT INTO wishlists (id, user_id, tour_id, created_at)
  SELECT id, user_id, tour_id, created_at
  FROM wishlists_bak;

DROP TABLE wishlists_bak;

CREATE TABLE spot_schedules (
  id             TEXT    PRIMARY KEY,
  user_id        TEXT    NOT NULL,
  tour_id        TEXT    NOT NULL,
  spot_id        TEXT    NOT NULL,
  scheduled_date TEXT    NOT NULL,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, tour_id, spot_id),
  FOREIGN KEY (tour_id)  REFERENCES tours(id),
  FOREIGN KEY (spot_id)  REFERENCES stamp_spots(id),
  FOREIGN KEY (user_id)  REFERENCES users(id)
);

INSERT INTO spot_schedules
  (id, user_id, tour_id, spot_id, scheduled_date, created_at, updated_at)
  SELECT id, user_id, tour_id, spot_id, scheduled_date, created_at, updated_at
  FROM spot_schedules_bak;

DROP TABLE spot_schedules_bak;

-- ── 5. Rebuild indexes ───────────────────────────────────────────────────────

-- tour_participations (from 0002 and 0003)
CREATE INDEX IF NOT EXISTS idx_tour_participations_user_status
  ON tour_participations (user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tour_participations_user_tour
  ON tour_participations (user_id, tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_participations_tour_joined
  ON tour_participations (tour_id, joined_at DESC);

-- tour_wishlist (from 0002)
CREATE INDEX IF NOT EXISTS idx_tour_wishlist_user
  ON tour_wishlist (user_id, updated_at DESC);

-- stamp_records (from 0002 and 0003)
CREATE INDEX IF NOT EXISTS idx_stamp_records_user_acquired
  ON stamp_records (user_id, acquired_at DESC);
CREATE INDEX IF NOT EXISTS idx_stamp_records_user_tour
  ON stamp_records (user_id, tour_id);
CREATE INDEX IF NOT EXISTS idx_stamp_records_tour_created
  ON stamp_records (tour_id, created_at DESC);

-- wishlists (from 0003)
CREATE INDEX IF NOT EXISTS idx_wishlists_user_tour
  ON wishlists (user_id, tour_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_tour_created
  ON wishlists (tour_id, created_at DESC);

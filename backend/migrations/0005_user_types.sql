-- Migrate role values: 'user' -> 'tourer', and update CHECK constraint
-- PRAGMA defer_foreign_keys defers FK checks to commit time, allowing the
-- intermediate state where users is dropped before users_new is renamed.
-- (PRAGMA foreign_keys = OFF is a no-op inside a transaction, which D1 uses.)
PRAGMA defer_foreign_keys = ON;

CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('tourer', 'admin')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO users_new
  SELECT id, email, password_hash, nickname,
    CASE WHEN role = 'user' THEN 'tourer' ELSE role END,
    created_at, updated_at
  FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

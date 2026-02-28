-- Spot visit schedules: stores user's planned visit dates per spot
CREATE TABLE IF NOT EXISTS spot_schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tour_id TEXT NOT NULL,
  spot_id TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, tour_id, spot_id),
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  FOREIGN KEY (spot_id) REFERENCES stamp_spots(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

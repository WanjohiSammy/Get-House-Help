-- Jirani database (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS helps (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  area          TEXT NOT NULL,
  kinds         TEXT NOT NULL DEFAULT '',   -- comma list: live-in,live-out,day
  tasks         TEXT NOT NULL DEFAULT '',   -- comma list: cleaning,cooking,...
  years         INTEGER NOT NULL DEFAULT 0,
  languages     TEXT NOT NULL DEFAULT '',
  salary        INTEGER,                    -- expected KES per month
  about         TEXT NOT NULL DEFAULT '',
  ref1_name     TEXT, ref1_phone TEXT,
  ref2_name     TEXT, ref2_phone TEXT,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | unavailable
  id_verified   INTEGER NOT NULL DEFAULT 0,
  good_conduct  INTEGER NOT NULL DEFAULT 0,
  refs_called   INTEGER NOT NULL DEFAULT 0,
  interviewed   INTEGER NOT NULL DEFAULT 0,
  certified     INTEGER NOT NULL DEFAULT 0,
  admin_notes   TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS helps_phone ON helps(phone);
CREATE INDEX IF NOT EXISTS helps_status ON helps(status);

CREATE TABLE IF NOT EXISTS requests (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,
  tasks         TEXT NOT NULL DEFAULT '',
  area          TEXT NOT NULL,
  start         TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  shortlist     TEXT NOT NULL DEFAULT '[]', -- JSON array of help ids, frozen at creation
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'open', -- open | awaiting_payment | pending_review | paid | hired | closed
  mpesa_code    TEXT,
  checkout_id   TEXT,
  receipt       TEXT,
  amount        INTEGER,
  hired_help_id TEXT,
  created_at    TEXT NOT NULL,
  paid_at       TEXT
);
CREATE INDEX IF NOT EXISTS requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS requests_checkout ON requests(checkout_id);

CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,role TEXT NOT NULL CHECK(role IN ('owner','partner')),password_hash TEXT NOT NULL,salt TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS invites (token_hash TEXT PRIMARY KEY,email TEXT NOT NULL,expires_at INTEGER NOT NULL,used_at INTEGER);
CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts(id),expires_at INTEGER NOT NULL,used_at INTEGER);
CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY,count INTEGER NOT NULL,window_start INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);
INSERT OR IGNORE INTO household(id,owner_name,partner_name,partner_email) VALUES('family','Li','Fiona','');

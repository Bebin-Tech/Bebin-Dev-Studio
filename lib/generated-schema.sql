CREATE TABLE IF NOT EXISTS built_users (
 space TEXT NOT NULL, id TEXT NOT NULL, email TEXT NOT NULL, name TEXT NOT NULL,
 password_hash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
 created TEXT NOT NULL, PRIMARY KEY(space,id), UNIQUE(space,email)
);
CREATE TABLE IF NOT EXISTS built_sessions (
 space TEXT NOT NULL, token_hash TEXT NOT NULL, user_id TEXT NOT NULL,
 expires INTEGER NOT NULL, PRIMARY KEY(space,token_hash),
 FOREIGN KEY(space,user_id) REFERENCES built_users(space,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS built_records (
 space TEXT NOT NULL, module TEXT NOT NULL, id TEXT NOT NULL, owner TEXT NOT NULL,
 data TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL,
 PRIMARY KEY(space,module,id)
);
CREATE INDEX IF NOT EXISTS built_records_owner ON built_records(space,module,owner,updated);
CREATE TABLE IF NOT EXISTS built_limits (
 bucket TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS built_audit (
 space TEXT NOT NULL, id TEXT NOT NULL, actor TEXT NOT NULL,
 action TEXT NOT NULL, module TEXT NOT NULL, record_id TEXT NOT NULL,
 created TEXT NOT NULL, PRIMARY KEY(space,id)
);

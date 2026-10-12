CREATE TABLE IF NOT EXISTS items (
  vault_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  iv TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (vault_id, item_id)
);

CREATE INDEX IF NOT EXISTS items_vault_updated
  ON items (vault_id, updated_at);

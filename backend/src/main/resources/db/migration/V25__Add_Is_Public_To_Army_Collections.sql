ALTER TABLE army_collections
    ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_army_collections_is_public ON army_collections (is_public);

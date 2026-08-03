CREATE TABLE IF NOT EXISTS army_collections
(
    id          UUID PRIMARY KEY,
    user_id     UUID         NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    CONSTRAINT fk_army_collections_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
            ON DELETE CASCADE
);

CREATE INDEX idx_army_collections_user_id ON army_collections (user_id);

ALTER TABLE army_collections
    ADD COLUMN display_order INTEGER;

WITH ordered AS (SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id) - 1 AS rn
                 FROM army_collections)
UPDATE army_collections ac
SET display_order = ordered.rn
FROM ordered
WHERE ac.id = ordered.id;

ALTER TABLE army_collections
    ALTER COLUMN display_order SET NOT NULL,
    ALTER COLUMN display_order SET DEFAULT 0;

CREATE TABLE army_collection_model_definition_positions
(
    id                  UUID PRIMARY KEY,
    army_collection_id  UUID    NOT NULL,
    model_definition_id UUID    NOT NULL,
    display_order       INTEGER NOT NULL,
    CONSTRAINT fk_acmdp_army_collection
        FOREIGN KEY (army_collection_id)
            REFERENCES army_collections (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_acmdp_model_definition
        FOREIGN KEY (model_definition_id)
            REFERENCES model_definitions (id)
            ON DELETE CASCADE,
    CONSTRAINT uq_acmdp_collection_definition
        UNIQUE (army_collection_id, model_definition_id)
);

CREATE INDEX idx_acmdp_army_collection_id ON army_collection_model_definition_positions (army_collection_id);

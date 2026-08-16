ALTER TABLE model_definitions
    ADD COLUMN description TEXT;

ALTER TABLE model_definitions
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

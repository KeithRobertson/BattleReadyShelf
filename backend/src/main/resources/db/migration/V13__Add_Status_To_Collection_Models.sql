CREATE TYPE collection_model_status AS ENUM ('BOXED', 'ASSEMBLED', 'PRIMED', 'PAINTED');

ALTER TABLE collection_models
    ADD COLUMN status collection_model_status NOT NULL DEFAULT 'BOXED';

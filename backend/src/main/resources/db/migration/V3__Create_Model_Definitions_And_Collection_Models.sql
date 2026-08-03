CREATE TABLE IF NOT EXISTS model_definitions
(
    id   UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

INSERT INTO model_definitions (id, name)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Poxwalker');

CREATE TABLE IF NOT EXISTS collection_models
(
    id                  UUID PRIMARY KEY,
    army_collection_id  UUID NOT NULL,
    model_definition_id UUID NOT NULL,
    name                VARCHAR(255),
    description         TEXT,
    CONSTRAINT fk_collection_models_army_collection
        FOREIGN KEY (army_collection_id)
            REFERENCES army_collections (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_collection_models_model_definition
        FOREIGN KEY (model_definition_id)
            REFERENCES model_definitions (id)
            ON DELETE RESTRICT
);

CREATE INDEX idx_collection_models_army_collection_id ON collection_models (army_collection_id);

CREATE TABLE IF NOT EXISTS collection_model_images
(
    id                  UUID PRIMARY KEY,
    collection_model_id UUID      NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_collection_model_images_collection_model
        FOREIGN KEY (collection_model_id)
            REFERENCES collection_models (id)
            ON DELETE CASCADE
);

CREATE INDEX idx_collection_model_images_collection_model_id ON collection_model_images (collection_model_id);

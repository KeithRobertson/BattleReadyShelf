ALTER TABLE collection_model_wargear_selections
    ADD COLUMN equipped BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE collection_model_wargear_selections
    DROP CONSTRAINT uq_collection_model_wargear_selections_slot;

CREATE UNIQUE INDEX uq_collection_model_wargear_equipped_slot
    ON collection_model_wargear_selections (collection_model_id, attachment_slot_id)
    WHERE equipped;

CREATE TABLE collection_model_magnetized_slots
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_model_id UUID NOT NULL,
    attachment_slot_id  UUID NOT NULL,
    CONSTRAINT fk_collection_model_magnetized_slots_model
        FOREIGN KEY (collection_model_id)
            REFERENCES collection_models (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_collection_model_magnetized_slots_slot
        FOREIGN KEY (attachment_slot_id)
            REFERENCES attachment_slots (id)
            ON DELETE CASCADE,
    CONSTRAINT uq_collection_model_magnetized_slots
        UNIQUE (collection_model_id, attachment_slot_id)
);

CREATE INDEX idx_collection_model_magnetized_slots_model_id
    ON collection_model_magnetized_slots (collection_model_id);

CREATE TABLE collection_model_identities
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_model_id UUID NOT NULL,
    model_definition_id UUID NOT NULL,
    CONSTRAINT fk_collection_model_identities_model
        FOREIGN KEY (collection_model_id)
            REFERENCES collection_models (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_collection_model_identities_definition
        FOREIGN KEY (model_definition_id)
            REFERENCES model_definitions (id)
            ON DELETE CASCADE,
    CONSTRAINT uq_collection_model_identities
        UNIQUE (collection_model_id, model_definition_id)
);

CREATE INDEX idx_collection_model_identities_model_id
    ON collection_model_identities (collection_model_id);

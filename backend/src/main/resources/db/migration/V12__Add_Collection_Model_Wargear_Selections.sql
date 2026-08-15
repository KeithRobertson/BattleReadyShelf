CREATE TABLE IF NOT EXISTS collection_model_wargear_selections
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_model_id UUID NOT NULL,
    attachment_slot_id  UUID NOT NULL,
    wargear_option_id   UUID,
    CONSTRAINT fk_collection_model_wargear_selections_collection_model
        FOREIGN KEY (collection_model_id)
            REFERENCES collection_models (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_collection_model_wargear_selections_attachment_slot
        FOREIGN KEY (attachment_slot_id)
            REFERENCES attachment_slots (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_collection_model_wargear_selections_wargear_option
        FOREIGN KEY (wargear_option_id)
            REFERENCES wargear_options (id)
            ON DELETE SET NULL,
    CONSTRAINT uq_collection_model_wargear_selections_slot
        UNIQUE (collection_model_id, attachment_slot_id)
);

CREATE INDEX idx_collection_model_wargear_selections_collection_model_id
    ON collection_model_wargear_selections (collection_model_id);

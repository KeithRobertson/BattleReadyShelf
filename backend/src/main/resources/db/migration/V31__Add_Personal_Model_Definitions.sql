ALTER TABLE model_definitions
    ADD COLUMN owner_user_id            UUID,
    ADD COLUMN base_model_definition_id UUID;

ALTER TABLE model_definitions
    ADD CONSTRAINT fk_model_definitions_owner_user
        FOREIGN KEY (owner_user_id)
            REFERENCES users (id)
            ON DELETE CASCADE,
    ADD CONSTRAINT fk_model_definitions_base_model_definition
        FOREIGN KEY (base_model_definition_id)
            REFERENCES model_definitions (id)
            ON DELETE SET NULL;

CREATE INDEX idx_model_definitions_owner_user_id
    ON model_definitions (owner_user_id)
    WHERE owner_user_id IS NOT NULL;

CREATE UNIQUE INDEX uq_model_definitions_owner_base
    ON model_definitions (owner_user_id, base_model_definition_id)
    WHERE owner_user_id IS NOT NULL AND base_model_definition_id IS NOT NULL;

ALTER TABLE attachment_slots
    ADD COLUMN base_attachment_slot_id UUID;

ALTER TABLE attachment_slots
    ADD CONSTRAINT fk_attachment_slots_base_attachment_slot
        FOREIGN KEY (base_attachment_slot_id)
            REFERENCES attachment_slots (id)
            ON DELETE SET NULL;

ALTER TABLE wargear_options
    ADD COLUMN base_wargear_option_id UUID;

ALTER TABLE wargear_options
    ADD CONSTRAINT fk_wargear_options_base_wargear_option
        FOREIGN KEY (base_wargear_option_id)
            REFERENCES wargear_options (id)
            ON DELETE SET NULL;

ALTER TABLE wargear_definitions
    ADD COLUMN owner_user_id UUID;

ALTER TABLE wargear_definitions
    ADD CONSTRAINT fk_wargear_definitions_owner_user
        FOREIGN KEY (owner_user_id)
            REFERENCES users (id)
            ON DELETE CASCADE;

CREATE INDEX idx_wargear_definitions_owner_user_id
    ON wargear_definitions (owner_user_id)
    WHERE owner_user_id IS NOT NULL;

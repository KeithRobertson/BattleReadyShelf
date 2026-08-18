CREATE TABLE IF NOT EXISTS factions
(
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id       VARCHAR(255) NOT NULL UNIQUE,
    name              VARCHAR(255) NOT NULL,
    parent_faction_id UUID,
    CONSTRAINT fk_factions_parent_faction
        FOREIGN KEY (parent_faction_id)
            REFERENCES factions (id)
            ON DELETE SET NULL
);

CREATE INDEX idx_factions_parent_faction_id ON factions (parent_faction_id);

ALTER TABLE model_definitions
    ADD COLUMN external_id VARCHAR(255) UNIQUE,
    ADD COLUMN faction_id UUID,
    ADD CONSTRAINT fk_model_definitions_faction
        FOREIGN KEY (faction_id)
            REFERENCES factions (id)
            ON DELETE SET NULL;

ALTER TABLE attachment_slots
    ADD COLUMN external_id VARCHAR(255);

ALTER TABLE wargear_options
    ADD COLUMN external_id VARCHAR(255);

-- external_id is only unique within a model definition, not globally.
CREATE UNIQUE INDEX uq_attachment_slots_model_definition_external_id
    ON attachment_slots (model_definition_id, external_id)
    WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX uq_wargear_options_model_definition_external_id
    ON wargear_options (model_definition_id, external_id)
    WHERE external_id IS NOT NULL;

ALTER TABLE model_definition_drafts
    ADD COLUMN external_id VARCHAR(255),
    ADD COLUMN faction_id UUID,
    ADD CONSTRAINT fk_model_definition_drafts_faction
        FOREIGN KEY (faction_id)
            REFERENCES factions (id)
            ON DELETE SET NULL;

ALTER TABLE attachment_slot_drafts
    ADD COLUMN external_id VARCHAR(255);

ALTER TABLE wargear_option_drafts
    ADD COLUMN external_id VARCHAR(255);

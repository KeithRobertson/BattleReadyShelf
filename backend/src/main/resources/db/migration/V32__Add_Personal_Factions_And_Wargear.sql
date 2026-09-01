ALTER TABLE factions
    ALTER COLUMN external_id DROP NOT NULL;

ALTER TABLE factions
    ADD COLUMN owner_user_id   UUID,
    ADD COLUMN base_faction_id UUID;

ALTER TABLE factions
    ADD CONSTRAINT fk_factions_owner_user
        FOREIGN KEY (owner_user_id)
            REFERENCES users (id)
            ON DELETE CASCADE,
    ADD CONSTRAINT fk_factions_base_faction
        FOREIGN KEY (base_faction_id)
            REFERENCES factions (id)
            ON DELETE SET NULL;

CREATE INDEX idx_factions_owner_user_id
    ON factions (owner_user_id)
    WHERE owner_user_id IS NOT NULL;

CREATE UNIQUE INDEX uq_factions_owner_base
    ON factions (owner_user_id, base_faction_id)
    WHERE owner_user_id IS NOT NULL AND base_faction_id IS NOT NULL;

ALTER TABLE wargear_definitions
    ADD COLUMN base_wargear_definition_id UUID;

ALTER TABLE wargear_definitions
    ADD CONSTRAINT fk_wargear_definitions_base_wargear_definition
        FOREIGN KEY (base_wargear_definition_id)
            REFERENCES wargear_definitions (id)
            ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_wargear_definitions_owner_base
    ON wargear_definitions (owner_user_id, base_wargear_definition_id)
    WHERE owner_user_id IS NOT NULL AND base_wargear_definition_id IS NOT NULL;

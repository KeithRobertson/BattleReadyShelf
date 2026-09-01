CREATE TABLE IF NOT EXISTS faction_drafts
(
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faction_id                 UUID                     NOT NULL,
    proposed_name              VARCHAR(255)             NOT NULL,
    proposed_parent_faction_id UUID,
    origin                     VARCHAR(16)              NOT NULL,
    created_at                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT fk_faction_drafts_faction
        FOREIGN KEY (faction_id) REFERENCES factions (id) ON DELETE CASCADE,
    CONSTRAINT fk_faction_drafts_proposed_parent
        FOREIGN KEY (proposed_parent_faction_id) REFERENCES factions (id) ON DELETE CASCADE,
    CONSTRAINT uq_faction_drafts_faction UNIQUE (faction_id)
);

ALTER TABLE wargear_definition_drafts
    ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NOT NULL DEFAULT 'IMPORT';
ALTER TABLE wargear_definition_drafts
    ALTER COLUMN origin DROP DEFAULT;

CREATE TABLE IF NOT EXISTS definition_publish_audit
(
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition VARCHAR(32)              NOT NULL,
    definition_id   UUID                     NOT NULL,
    published_by    UUID                     NOT NULL,
    published_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    origin          VARCHAR(16)              NOT NULL,
    previous_state  TEXT                     NOT NULL,
    new_state       TEXT                     NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_definition_publish_audit_definition
    ON definition_publish_audit (definition, definition_id, published_at DESC);

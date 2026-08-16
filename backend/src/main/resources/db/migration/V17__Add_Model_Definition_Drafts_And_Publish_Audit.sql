CREATE TABLE IF NOT EXISTS model_definition_drafts
(
    id                            UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    published_model_definition_id UUID,
    name                          VARCHAR(255) NOT NULL,
    description                   TEXT,
    created_by                    UUID         NOT NULL,
    created_at                    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by                    UUID         NOT NULL,
    updated_at                    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_model_definition_drafts_published_model_definition
        FOREIGN KEY (published_model_definition_id)
            REFERENCES model_definitions (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_model_definition_drafts_created_by
        FOREIGN KEY (created_by)
            REFERENCES users (id),
    CONSTRAINT fk_model_definition_drafts_updated_by
        FOREIGN KEY (updated_by)
            REFERENCES users (id)
);

CREATE UNIQUE INDEX uq_model_definition_drafts_published_model_definition_id
    ON model_definition_drafts (published_model_definition_id)
    WHERE published_model_definition_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS attachment_slot_drafts
(
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_definition_draft_id    UUID         NOT NULL,
    published_attachment_slot_id UUID,
    name                         VARCHAR(255) NOT NULL,
    CONSTRAINT fk_attachment_slot_drafts_model_definition_draft
        FOREIGN KEY (model_definition_draft_id)
            REFERENCES model_definition_drafts (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_attachment_slot_drafts_published_attachment_slot
        FOREIGN KEY (published_attachment_slot_id)
            REFERENCES attachment_slots (id)
            ON DELETE CASCADE
);

CREATE INDEX idx_attachment_slot_drafts_model_definition_draft_id
    ON attachment_slot_drafts (model_definition_draft_id);

CREATE TABLE IF NOT EXISTS wargear_option_drafts
(
    id                          UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    model_definition_draft_id   UUID         NOT NULL,
    published_wargear_option_id UUID,
    name                        VARCHAR(255) NOT NULL,
    is_default                  BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_wargear_option_drafts_model_definition_draft
        FOREIGN KEY (model_definition_draft_id)
            REFERENCES model_definition_drafts (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_wargear_option_drafts_published_wargear_option
        FOREIGN KEY (published_wargear_option_id)
            REFERENCES wargear_options (id)
            ON DELETE CASCADE
);

CREATE INDEX idx_wargear_option_drafts_model_definition_draft_id
    ON wargear_option_drafts (model_definition_draft_id);

CREATE TABLE IF NOT EXISTS wargear_option_slot_drafts
(
    wargear_option_draft_id  UUID NOT NULL,
    attachment_slot_draft_id UUID NOT NULL,
    PRIMARY KEY (wargear_option_draft_id, attachment_slot_draft_id),
    CONSTRAINT fk_wargear_option_slot_drafts_wargear_option_draft
        FOREIGN KEY (wargear_option_draft_id)
            REFERENCES wargear_option_drafts (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_wargear_option_slot_drafts_attachment_slot_draft
        FOREIGN KEY (attachment_slot_draft_id)
            REFERENCES attachment_slot_drafts (id)
            ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS model_definition_publish_audit
(
    id                  UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    model_definition_id UUID        NOT NULL,
    version             INTEGER     NOT NULL,
    published_by        UUID        NOT NULL,
    published_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    change_summary      TEXT,
    snapshot            TEXT        NOT NULL,
    CONSTRAINT fk_model_definition_publish_audit_model_definition
        FOREIGN KEY (model_definition_id)
            REFERENCES model_definitions (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_model_definition_publish_audit_published_by
        FOREIGN KEY (published_by)
            REFERENCES users (id)
);

CREATE INDEX idx_model_definition_publish_audit_model_definition_id
    ON model_definition_publish_audit (model_definition_id);

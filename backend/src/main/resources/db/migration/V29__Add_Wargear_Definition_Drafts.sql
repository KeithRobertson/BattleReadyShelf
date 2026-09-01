CREATE TABLE IF NOT EXISTS wargear_definition_drafts
(
    id                     UUID PRIMARY KEY   DEFAULT gen_random_uuid(),
    wargear_definition_id  UUID         NOT NULL,
    proposed_name          VARCHAR(255) NOT NULL,
    created_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT fk_wargear_definition_drafts_definition
        FOREIGN KEY (wargear_definition_id) REFERENCES wargear_definitions (id) ON DELETE CASCADE,
    CONSTRAINT uq_wargear_definition_drafts_definition UNIQUE (wargear_definition_id)
);

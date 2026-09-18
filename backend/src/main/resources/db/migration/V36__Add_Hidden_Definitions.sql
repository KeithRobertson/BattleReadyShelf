CREATE TABLE user_hidden_model_definitions
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    model_definition_id UUID NOT NULL,
    CONSTRAINT fk_uhmd_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_uhmd_model_definition
        FOREIGN KEY (model_definition_id)
            REFERENCES model_definitions (id)
            ON DELETE CASCADE,
    CONSTRAINT uq_uhmd_user_model_definition
        UNIQUE (user_id, model_definition_id)
);

CREATE TABLE user_hidden_factions
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    faction_id UUID NOT NULL,
    CONSTRAINT fk_uhf_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_uhf_faction
        FOREIGN KEY (faction_id)
            REFERENCES factions (id)
            ON DELETE CASCADE,
    CONSTRAINT uq_uhf_user_faction
        UNIQUE (user_id, faction_id)
);

CREATE TABLE user_hidden_wargear_definitions
(
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL,
    wargear_definition_id UUID NOT NULL,
    CONSTRAINT fk_uhwd_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_uhwd_wargear_definition
        FOREIGN KEY (wargear_definition_id)
            REFERENCES wargear_definitions (id)
            ON DELETE CASCADE,
    CONSTRAINT uq_uhwd_user_wargear_definition
        UNIQUE (user_id, wargear_definition_id)
);

CREATE TABLE user_hidden_paints
(
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id  UUID NOT NULL,
    paint_id UUID NOT NULL,
    CONSTRAINT fk_uhp_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_uhp_paint
        FOREIGN KEY (paint_id)
            REFERENCES paints (id)
            ON DELETE CASCADE,
    CONSTRAINT uq_uhp_user_paint
        UNIQUE (user_id, paint_id)
);

CREATE INDEX idx_uhmd_model_definition_id ON user_hidden_model_definitions (model_definition_id);
CREATE INDEX idx_uhf_faction_id ON user_hidden_factions (faction_id);
CREATE INDEX idx_uhwd_wargear_definition_id ON user_hidden_wargear_definitions (wargear_definition_id);
CREATE INDEX idx_uhp_paint_id ON user_hidden_paints (paint_id);

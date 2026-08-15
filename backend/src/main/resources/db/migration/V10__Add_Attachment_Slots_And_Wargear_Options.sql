CREATE TABLE IF NOT EXISTS attachment_slots
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_definition_id UUID         NOT NULL,
    name                VARCHAR(255) NOT NULL,
    CONSTRAINT fk_attachment_slots_model_definition
        FOREIGN KEY (model_definition_id)
            REFERENCES model_definitions (id)
            ON DELETE CASCADE,
    CONSTRAINT uq_attachment_slots_model_definition_name
        UNIQUE (model_definition_id, name)
);

CREATE INDEX idx_attachment_slots_model_definition_id ON attachment_slots (model_definition_id);

CREATE TABLE IF NOT EXISTS wargear_options
(
    id                  UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    model_definition_id UUID         NOT NULL,
    name                VARCHAR(255) NOT NULL,
    is_default          BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_wargear_options_model_definition
        FOREIGN KEY (model_definition_id)
            REFERENCES model_definitions (id)
            ON DELETE CASCADE
);

CREATE INDEX idx_wargear_options_model_definition_id ON wargear_options (model_definition_id);

CREATE TABLE IF NOT EXISTS wargear_option_slots
(
    wargear_option_id  UUID NOT NULL,
    attachment_slot_id UUID NOT NULL,
    PRIMARY KEY (wargear_option_id, attachment_slot_id),
    CONSTRAINT fk_wargear_option_slots_wargear_option
        FOREIGN KEY (wargear_option_id)
            REFERENCES wargear_options (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_wargear_option_slots_attachment_slot
        FOREIGN KEY (attachment_slot_id)
            REFERENCES attachment_slots (id)
            ON DELETE CASCADE
);

INSERT INTO attachment_slots (model_definition_id, name)
SELECT id, 'Left Arm'
FROM model_definitions
WHERE name = 'Plague Marine';

INSERT INTO attachment_slots (model_definition_id, name)
SELECT id, 'Right Arm'
FROM model_definitions
WHERE name = 'Plague Marine';

INSERT INTO wargear_options (model_definition_id, name, is_default)
SELECT id, 'Boltgun', TRUE
FROM model_definitions
WHERE name = 'Plague Marine';

INSERT INTO wargear_options (model_definition_id, name, is_default)
SELECT id, 'Plagueknife', TRUE
FROM model_definitions
WHERE name = 'Plague Marine';

INSERT INTO wargear_options (model_definition_id, name, is_default)
SELECT id, 'Heavy Plague Weapon', FALSE
FROM model_definitions
WHERE name = 'Plague Marine';

INSERT INTO wargear_option_slots (wargear_option_id, attachment_slot_id)
SELECT wo.id, slot.id
FROM wargear_options wo
         JOIN model_definitions md ON md.id = wo.model_definition_id AND md.name = 'Plague Marine'
         JOIN attachment_slots slot ON slot.model_definition_id = md.id AND slot.name = 'Left Arm'
WHERE wo.name = 'Boltgun';

INSERT INTO wargear_option_slots (wargear_option_id, attachment_slot_id)
SELECT wo.id, slot.id
FROM wargear_options wo
         JOIN model_definitions md ON md.id = wo.model_definition_id AND md.name = 'Plague Marine'
         JOIN attachment_slots slot ON slot.model_definition_id = md.id AND slot.name = 'Right Arm'
WHERE wo.name = 'Plagueknife';

INSERT INTO wargear_option_slots (wargear_option_id, attachment_slot_id)
SELECT wo.id, slot.id
FROM wargear_options wo
         JOIN model_definitions md ON md.id = wo.model_definition_id AND md.name = 'Plague Marine'
         JOIN attachment_slots slot ON slot.model_definition_id = md.id AND slot.name = 'Left Arm'
WHERE wo.name = 'Heavy Plague Weapon';

-- Marks a default loadout item that occupies every eligible slot as one physical piece
-- (a two-handed weapon). Independent defaults still fill each eligible slot separately.
ALTER TABLE wargear_options
    ADD COLUMN is_default_linked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE wargear_option_drafts
    ADD COLUMN is_default_linked BOOLEAN NOT NULL DEFAULT FALSE;

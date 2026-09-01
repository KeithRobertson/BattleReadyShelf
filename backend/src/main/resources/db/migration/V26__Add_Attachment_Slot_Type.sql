ALTER TABLE attachment_slots
    ADD COLUMN type VARCHAR(255) NOT NULL DEFAULT 'other';

ALTER TABLE attachment_slots
    ALTER COLUMN type DROP DEFAULT;

ALTER TABLE attachment_slot_drafts
    ADD COLUMN type VARCHAR(255) NOT NULL DEFAULT 'other';

ALTER TABLE attachment_slot_drafts
    ALTER COLUMN type DROP DEFAULT;

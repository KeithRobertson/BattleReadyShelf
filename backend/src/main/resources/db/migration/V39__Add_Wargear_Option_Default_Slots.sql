-- Slots a default loadout option occupies, distinct from eligibility (wargear_option_slots).
-- Empty with is_default means every eligible slot, matching previous behaviour.
CREATE TABLE wargear_option_default_slots
(
    wargear_option_id  UUID NOT NULL,
    attachment_slot_id UUID NOT NULL,
    PRIMARY KEY (wargear_option_id, attachment_slot_id),
    CONSTRAINT fk_wargear_option_default_slots_option
        FOREIGN KEY (wargear_option_id)
            REFERENCES wargear_options (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_wargear_option_default_slots_slot
        FOREIGN KEY (attachment_slot_id)
            REFERENCES attachment_slots (id)
            ON DELETE CASCADE
);

CREATE TABLE wargear_option_default_slot_drafts
(
    wargear_option_draft_id  UUID NOT NULL,
    attachment_slot_draft_id UUID NOT NULL,
    PRIMARY KEY (wargear_option_draft_id, attachment_slot_draft_id),
    CONSTRAINT fk_wargear_option_default_slot_drafts_option
        FOREIGN KEY (wargear_option_draft_id)
            REFERENCES wargear_option_drafts (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_wargear_option_default_slot_drafts_slot
        FOREIGN KEY (attachment_slot_draft_id)
            REFERENCES attachment_slot_drafts (id)
            ON DELETE CASCADE
);

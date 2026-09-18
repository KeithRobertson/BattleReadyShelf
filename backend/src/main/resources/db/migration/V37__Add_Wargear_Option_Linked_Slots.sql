ALTER TABLE collection_model_wargear_selections
    ADD COLUMN link_group_id UUID;

CREATE INDEX idx_collection_model_wargear_selections_link_group_id
    ON collection_model_wargear_selections (link_group_id)
    WHERE link_group_id IS NOT NULL;

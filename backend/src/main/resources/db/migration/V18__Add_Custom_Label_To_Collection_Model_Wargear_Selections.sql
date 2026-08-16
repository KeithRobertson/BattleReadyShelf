ALTER TABLE collection_model_wargear_selections
    ADD COLUMN custom_label VARCHAR(255);

ALTER TABLE collection_model_wargear_selections
    ADD CONSTRAINT chk_collection_model_wargear_selections_one_of
        CHECK (wargear_option_id IS NULL OR custom_label IS NULL);

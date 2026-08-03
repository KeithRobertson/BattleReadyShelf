ALTER TABLE collection_model_images
    ADD COLUMN storage_key  VARCHAR(1024) NOT NULL default '',
    ADD COLUMN content_type VARCHAR(255)  NOT NULL default '',
    ADD COLUMN size_bytes   BIGINT;

CREATE UNIQUE INDEX idx_collection_model_images_storage_key ON collection_model_images (storage_key);

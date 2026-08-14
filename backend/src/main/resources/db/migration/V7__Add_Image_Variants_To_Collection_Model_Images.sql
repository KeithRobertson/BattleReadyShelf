DROP INDEX IF EXISTS idx_collection_model_images_storage_key;

ALTER TABLE collection_model_images
    RENAME COLUMN storage_key TO original_storage_key;
ALTER TABLE collection_model_images
    RENAME COLUMN content_type TO original_content_type;
ALTER TABLE collection_model_images
    RENAME COLUMN size_bytes TO original_size_bytes;

ALTER TABLE collection_model_images
    ADD COLUMN large_storage_key      VARCHAR(1024),
    ADD COLUMN large_content_type     VARCHAR(255),
    ADD COLUMN large_size_bytes       BIGINT,
    ADD COLUMN thumbnail_storage_key  VARCHAR(1024),
    ADD COLUMN thumbnail_content_type VARCHAR(255),
    ADD COLUMN thumbnail_size_bytes   BIGINT;

CREATE UNIQUE INDEX idx_collection_model_images_original_storage_key
    ON collection_model_images (original_storage_key);
CREATE UNIQUE INDEX idx_collection_model_images_large_storage_key
    ON collection_model_images (large_storage_key);
CREATE UNIQUE INDEX idx_collection_model_images_thumbnail_storage_key
    ON collection_model_images (thumbnail_storage_key);

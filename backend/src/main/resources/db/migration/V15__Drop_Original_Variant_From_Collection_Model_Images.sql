DROP INDEX IF EXISTS idx_collection_model_images_original_storage_key;

ALTER TABLE collection_model_images
    DROP COLUMN original_storage_key,
    DROP COLUMN original_content_type,
    DROP COLUMN original_size_bytes;

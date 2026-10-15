ALTER TABLE collection_model_images
    ADD COLUMN list_thumbnail BOOLEAN NOT NULL DEFAULT false;

UPDATE collection_model_images AS image
SET list_thumbnail = true
WHERE image.id IN (
    SELECT DISTINCT ON (collection_model_id) id
    FROM collection_model_images
    ORDER BY collection_model_id, created_at ASC, id ASC
);

CREATE UNIQUE INDEX idx_collection_model_images_one_list_thumbnail
    ON collection_model_images (collection_model_id)
    WHERE list_thumbnail;

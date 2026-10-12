CREATE TABLE collection_model_status_events
(
    id                  UUID PRIMARY KEY,
    collection_model_id UUID                     NOT NULL,
    status              collection_model_status  NOT NULL,
    changed_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_collection_model_status_events_collection_model
        FOREIGN KEY (collection_model_id)
            REFERENCES collection_models (id)
            ON DELETE CASCADE
);

CREATE INDEX idx_collection_model_status_events_model_changed_at
    ON collection_model_status_events (collection_model_id, changed_at DESC);

INSERT INTO collection_model_status_events (id, collection_model_id, status, changed_at)
SELECT gen_random_uuid(),
       id,
       status,
       COALESCE(finished_on::timestamp AT TIME ZONE 'UTC', CURRENT_TIMESTAMP)
FROM collection_models;

ALTER TABLE collection_models
    DROP COLUMN finished_on;

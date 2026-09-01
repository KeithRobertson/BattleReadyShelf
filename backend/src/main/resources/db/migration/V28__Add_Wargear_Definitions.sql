CREATE TABLE IF NOT EXISTS wargear_definitions
(
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE,
    name        VARCHAR(255) NOT NULL
);

CREATE INDEX idx_wargear_definitions_name ON wargear_definitions (name);

INSERT INTO wargear_definitions (external_id, name)
SELECT external_id, name
FROM (SELECT external_id,
             name,
             ROW_NUMBER() OVER (PARTITION BY external_id ORDER BY count(*) DESC, name) AS name_rank
      FROM wargear_options
      WHERE external_id IS NOT NULL
      GROUP BY external_id, name) ranked
WHERE name_rank = 1;

INSERT INTO wargear_definitions (external_id, name)
SELECT external_id, name
FROM (SELECT external_id,
             name,
             ROW_NUMBER() OVER (PARTITION BY external_id ORDER BY count(*) DESC, name) AS name_rank
      FROM wargear_option_drafts
      WHERE external_id IS NOT NULL
      GROUP BY external_id, name) ranked
WHERE name_rank = 1
  AND NOT EXISTS (SELECT 1 FROM wargear_definitions existing WHERE existing.external_id = ranked.external_id);

INSERT INTO wargear_definitions (external_id, name)
SELECT NULL, unnamed.name
FROM (SELECT DISTINCT name FROM wargear_options WHERE external_id IS NULL
      UNION
      SELECT DISTINCT name FROM wargear_option_drafts WHERE external_id IS NULL) unnamed
WHERE NOT EXISTS (SELECT 1 FROM wargear_definitions existing WHERE existing.name = unnamed.name);

ALTER TABLE wargear_options
    ADD COLUMN wargear_definition_id UUID;

UPDATE wargear_options wo
SET wargear_definition_id = wd.id
FROM wargear_definitions wd
WHERE wo.external_id IS NOT NULL
  AND wd.external_id = wo.external_id;

UPDATE wargear_options wo
SET wargear_definition_id = wd.id
FROM wargear_definitions wd
WHERE wo.wargear_definition_id IS NULL
  AND wd.external_id IS NULL
  AND wd.name = wo.name;

ALTER TABLE wargear_option_drafts
    ADD COLUMN wargear_definition_id UUID;

UPDATE wargear_option_drafts wod
SET wargear_definition_id = wd.id
FROM wargear_definitions wd
WHERE wod.external_id IS NOT NULL
  AND wd.external_id = wod.external_id;

UPDATE wargear_option_drafts wod
SET wargear_definition_id = wd.id
FROM wargear_definitions wd
WHERE wod.wargear_definition_id IS NULL
  AND wd.external_id IS NULL
  AND wd.name = wod.name;

ALTER TABLE wargear_options
    ALTER COLUMN wargear_definition_id SET NOT NULL,
    ADD CONSTRAINT fk_wargear_options_wargear_definition
        FOREIGN KEY (wargear_definition_id)
            REFERENCES wargear_definitions (id),
    DROP COLUMN external_id,
    DROP COLUMN name;

ALTER TABLE wargear_option_drafts
    ALTER COLUMN wargear_definition_id SET NOT NULL,
    ADD CONSTRAINT fk_wargear_option_drafts_wargear_definition
        FOREIGN KEY (wargear_definition_id)
            REFERENCES wargear_definitions (id),
    DROP COLUMN external_id,
    DROP COLUMN name;

CREATE INDEX idx_wargear_options_wargear_definition_id ON wargear_options (wargear_definition_id);
CREATE INDEX idx_wargear_option_drafts_wargear_definition_id ON wargear_option_drafts (wargear_definition_id);

ALTER TABLE wargear_options
    ADD CONSTRAINT uq_wargear_options_model_definition_wargear_definition
        UNIQUE (model_definition_id, wargear_definition_id);

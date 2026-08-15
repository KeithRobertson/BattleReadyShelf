ALTER TABLE model_definitions
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

INSERT INTO model_definitions (name)
VALUES ('Plague Marine');

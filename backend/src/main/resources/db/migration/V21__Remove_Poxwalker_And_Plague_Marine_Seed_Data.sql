DELETE FROM collection_models
WHERE model_definition_id IN (
    SELECT id FROM model_definitions WHERE name IN ('Poxwalker', 'Plague Marine')
);

DELETE FROM model_definitions
WHERE name IN ('Poxwalker', 'Plague Marine');

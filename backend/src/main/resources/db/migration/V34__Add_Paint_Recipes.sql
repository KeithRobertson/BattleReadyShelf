CREATE TABLE IF NOT EXISTS paint_recipes
(
    id                  UUID PRIMARY KEY         DEFAULT gen_random_uuid(),
    scope               VARCHAR(16) NOT NULL,
    army_collection_id  UUID        NOT NULL,
    model_definition_id UUID,
    collection_model_id UUID,
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT fk_paint_recipes_army_collection
        FOREIGN KEY (army_collection_id) REFERENCES army_collections (id) ON DELETE CASCADE,
    CONSTRAINT fk_paint_recipes_model_definition
        FOREIGN KEY (model_definition_id) REFERENCES model_definitions (id) ON DELETE CASCADE,
    CONSTRAINT fk_paint_recipes_collection_model
        FOREIGN KEY (collection_model_id) REFERENCES collection_models (id) ON DELETE CASCADE,
    -- The target columns must agree with the scope, so a row can never be ambiguous about what it
    -- applies to. Without this a MODEL_TYPE row carrying a collection_model_id would silently be
    -- picked up by the wrong resolution step.
    CONSTRAINT ck_paint_recipes_scope_target
        CHECK (
            (scope = 'COLLECTION' AND model_definition_id IS NULL AND collection_model_id IS NULL)
                OR (scope = 'MODEL_TYPE' AND model_definition_id IS NOT NULL AND collection_model_id IS NULL)
                OR (scope = 'MODEL' AND model_definition_id IS NULL AND collection_model_id IS NOT NULL)
            )
);

CREATE UNIQUE INDEX uq_paint_recipes_collection
    ON paint_recipes (army_collection_id)
    WHERE scope = 'COLLECTION';

CREATE UNIQUE INDEX uq_paint_recipes_model_type
    ON paint_recipes (army_collection_id, model_definition_id)
    WHERE scope = 'MODEL_TYPE';

CREATE UNIQUE INDEX uq_paint_recipes_model
    ON paint_recipes (collection_model_id)
    WHERE scope = 'MODEL';

CREATE INDEX idx_paint_recipes_army_collection_id
    ON paint_recipes (army_collection_id);

CREATE TABLE IF NOT EXISTS paint_recipe_paints
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id  UUID    NOT NULL,
    paint_id   UUID    NOT NULL,
    position   INTEGER NOT NULL,
    step_label VARCHAR(255),
    note       VARCHAR(255),
    CONSTRAINT fk_paint_recipe_paints_recipe
        FOREIGN KEY (recipe_id) REFERENCES paint_recipes (id) ON DELETE CASCADE,
    CONSTRAINT fk_paint_recipe_paints_paint
        FOREIGN KEY (paint_id) REFERENCES paints (id) ON DELETE RESTRICT,
    CONSTRAINT uq_paint_recipe_paints_position UNIQUE (recipe_id, position)
);

CREATE INDEX idx_paint_recipe_paints_recipe_id
    ON paint_recipe_paints (recipe_id);

CREATE INDEX idx_paint_recipe_paints_paint_id
    ON paint_recipe_paints (paint_id);

ALTER TABLE paint_recipe_paints
    ADD COLUMN show_on_card BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE paint_recipe_paints
SET show_on_card = FALSE
WHERE position >= 3;

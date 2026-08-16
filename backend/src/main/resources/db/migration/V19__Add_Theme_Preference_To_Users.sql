CREATE TYPE theme_preference AS ENUM ('LIGHT', 'DARK', 'AUTO');

ALTER TABLE users
    ADD COLUMN theme_preference theme_preference NOT NULL DEFAULT 'AUTO';

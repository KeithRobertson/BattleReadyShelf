CREATE TABLE IF NOT EXISTS paints
(
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id   VARCHAR(255) UNIQUE,
    owner_user_id UUID,
    base_paint_id UUID,
    name          VARCHAR(255) NOT NULL,
    brand         VARCHAR(255),
    paint_type    VARCHAR(32),
    hex_colour    VARCHAR(7),
    CONSTRAINT fk_paints_owner_user
        FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_paints_base_paint
        FOREIGN KEY (base_paint_id) REFERENCES paints (id) ON DELETE SET NULL,
    CONSTRAINT ck_paints_hex_colour
        CHECK (hex_colour IS NULL OR hex_colour ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE INDEX idx_paints_owner_user_id
    ON paints (owner_user_id)
    WHERE owner_user_id IS NOT NULL;

CREATE UNIQUE INDEX uq_paints_owner_base
    ON paints (owner_user_id, base_paint_id)
    WHERE owner_user_id IS NOT NULL AND base_paint_id IS NOT NULL;

CREATE UNIQUE INDEX uq_paints_shared_brand_name
    ON paints (coalesce(lower(brand), ''), lower(name))
    WHERE owner_user_id IS NULL;

CREATE UNIQUE INDEX uq_paints_owner_brand_name
    ON paints (owner_user_id, coalesce(lower(brand), ''), lower(name))
    WHERE owner_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS paint_drafts
(
    id                  UUID PRIMARY KEY         DEFAULT gen_random_uuid(),
    paint_id            UUID         NOT NULL,
    proposed_name       VARCHAR(255) NOT NULL,
    proposed_brand      VARCHAR(255),
    proposed_paint_type VARCHAR(32),
    proposed_hex_colour VARCHAR(7),
    origin              VARCHAR(16)  NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT fk_paint_drafts_paint
        FOREIGN KEY (paint_id) REFERENCES paints (id) ON DELETE CASCADE,
    CONSTRAINT uq_paint_drafts_paint UNIQUE (paint_id)
);

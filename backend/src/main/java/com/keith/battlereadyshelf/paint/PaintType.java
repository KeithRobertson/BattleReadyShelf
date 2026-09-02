package com.keith.battlereadyshelf.paint;

/**
 * What a paint is for, which is also roughly the order it goes on a model.
 *
 * <p>Recipes are ordered by the step the user writes rather than by this, but it makes a long
 * catalogue searchable and records why two similar colours are not interchangeable - a shade and a
 * layer paint of the same hue behave nothing alike.
 *
 * <p>Mirrors the generated DTO enum of the same name, which lives in a different package.
 */
public enum PaintType {
    BASE,
    LAYER,
    SHADE,
    CONTRAST,
    DRY,
    TECHNICAL,
    PRIMER,
    VARNISH,
    OTHER
}

package com.keith.battlereadyshelf.paint;

/**
 * What a paint recipe is attached to.
 *
 * <p>The levels exist because painters repeat themselves. A whole force usually shares a base coat
 * and a metal - "everything here is based Fenrisian Grey" - and every model of one type is normally
 * painted identically, so recording that once per collection or per unit type is both less work and
 * more truthful than copying it onto each miniature.
 *
 * <p>They compose rather than override: a model shows its collection's recipe, then its type's,
 * then its own, most specific last. Nothing is subtracted, so a broader recipe is never silently
 * hidden by a narrower one.
 */
public enum PaintRecipeScope {
    /** Every model in the collection. */
    COLLECTION,

    /** Every model of one type within one collection. */
    MODEL_TYPE,

    /** One individual miniature. */
    MODEL
}

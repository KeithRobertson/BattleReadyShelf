package com.keith.battlereadyshelf.collectionmodel;

/**
 * Tracks a {@link CollectionModelEntity}'s progress through the typical painting pipeline:
 * bought but still in the box, physically assembled, primed, and finally fully painted.
 */
public enum CollectionModelStatus {
    BOXED,
    ASSEMBLED,
    PRIMED,
    PAINTED
}

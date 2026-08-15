package com.keith.battlereadyshelf.collectionmodel;

/**
 * Tracks a {@link CollectionModelEntity}'s progress through the typical painting pipeline:
 * bought but still in the box, being assembled, physically assembled, being primed, primed,
 * being painted, and finally fully painted. The "-ING" states are interstitial/in-progress
 * markers between the corresponding completed milestones.
 */
public enum CollectionModelStatus {
    BOXED,
    ASSEMBLING,
    ASSEMBLED,
    PRIMING,
    PRIMED,
    PAINTING,
    PAINTED
}

package com.keith.battlereadyshelf.definitiondraft;

/**
 * Which kind of definition a {@link DefinitionPublishAuditEntity} row describes.
 *
 * <p>Factions and wargear share one audit table because each is a simple named row whose history
 * is fully described by the state either side of a publish. Model definitions are compound
 * aggregates and keep their own richer, versioned audit trail.
 */
public enum Definition {
    FACTION,
    WARGEAR
}

package com.keith.battlereadyshelf.hiddendefinition;

import java.util.Set;
import java.util.UUID;

/**
 * Which model definitions one user has out of their way, by both routes at once.
 *
 * <p>A model definition can be hidden without ever being named: hiding a faction hides everything
 * under it, because the reason to hide a faction is that you do not play it. Both the picker lists
 * and the {@code hidden} flag on the personal lists have to agree about that, so the rule lives here
 * rather than being spelled out at each of them.
 */
public record HiddenModelDefinitions(Set<UUID> definitionIds, Set<UUID> factionIds) {

    public static HiddenModelDefinitions none() {
        return new HiddenModelDefinitions(Set.of(), Set.of());
    }

    public boolean includes(UUID modelDefinitionId, UUID factionId) {
        return definitionIds.contains(modelDefinitionId)
                || (factionId != null && factionIds.contains(factionId));
    }
}

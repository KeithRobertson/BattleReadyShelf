package com.keith.battlereadyshelf.factiondefinition;

import com.keith.battlereadyshelf.error.BadRequestException;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Guards the faction hierarchy against cycles. Reparenting is possible from the admin pages and
 * from a user's own factions, and a cycle would loop forever when walking the tree.
 *
 * <p>The whole table is walked rather than just the shared catalogue, because a personal faction
 * may sit beneath a shared one: a cycle that passes through a personal row is still a cycle.
 */
@Component
@RequiredArgsConstructor
public class FactionCycleGuard {

    private final FactionRepository factionRepository;

    public void requireNoCycle(UUID factionId, UUID proposedParentFactionId) {
        if (proposedParentFactionId == null) {
            return;
        }
        if (proposedParentFactionId.equals(factionId)) {
            throw new BadRequestException("A faction cannot be its own parent.");
        }

        Map<UUID, UUID> parentById =
                factionRepository.findAll().stream()
                        .filter(f -> f.getParentFactionId() != null)
                        .collect(Collectors.toMap(FactionEntity::getId, FactionEntity::getParentFactionId));

        var seen = new HashSet<UUID>();
        var ancestor = proposedParentFactionId;
        while (ancestor != null && seen.add(ancestor)) {
            if (ancestor.equals(factionId)) {
                throw new BadRequestException(
                        "That faction is already beneath this one, so it cannot also be its parent.");
            }
            ancestor = parentById.get(ancestor);
        }
    }
}

package com.keith.battlereadyshelf.modeldefinition;

import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Resolves the slots a default option occupies from a request. Unknown or ineligible ids are
 * dropped rather than rejected: overlapping defaults are already a warning, not a save error.
 */
public final class DefaultAttachmentSlots {
    private DefaultAttachmentSlots() {}

    public static <S> LinkedHashSet<S> resolve(
            boolean isDefault, List<UUID> requestedIds, Collection<S> eligible, Map<UUID, S> byRequestId) {
        if (!isDefault || requestedIds == null || requestedIds.isEmpty()) {
            return new LinkedHashSet<>();
        }
        var eligibleSet = new HashSet<>(eligible);
        var resolved = new LinkedHashSet<S>();
        for (var id : requestedIds) {
            var slot = byRequestId.get(id);
            if (slot != null && eligibleSet.contains(slot)) {
                resolved.add(slot);
            }
        }
        return resolved;
    }
}

package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.modeldefinition.AttachmentSlotEntity;
import com.keith.battlereadyshelf.modeldefinition.WargearOptionEntity;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Chooses the wargear a newly added miniature starts with from the definition's default loadout.
 *
 * <p>Occupancy is permissive: a slot claimed by more than one default is left empty rather than
 * guessing. A linked (two-handed) default is only applied when every slot it occupies is
 * unambiguous.
 */
public final class DefaultLoadoutPlanner {
    public record PlannedSelection(UUID attachmentSlotId, UUID wargearOptionId, UUID linkGroupId) {}

    private DefaultLoadoutPlanner() {}

    public static List<PlannedSelection> plan(List<WargearOptionEntity> options) {
        var defaults = options.stream().filter(WargearOptionEntity::isDefault).toList();
        Map<UUID, List<WargearOptionEntity>> optionsBySlot = new HashMap<>();
        for (var option : defaults) {
            for (var slotId : slotIdsOf(option)) {
                optionsBySlot.computeIfAbsent(slotId, key -> new ArrayList<>()).add(option);
            }
        }

        Set<UUID> ambiguousSlots = new HashSet<>();
        for (var entry : optionsBySlot.entrySet()) {
            if (entry.getValue().size() > 1) {
                ambiguousSlots.add(entry.getKey());
            }
        }

        List<PlannedSelection> planned = new ArrayList<>();
        Set<UUID> assignedSlots = new HashSet<>();

        for (var option : defaults) {
            if (option.getId() == null || !occupiesLinked(option)) {
                continue;
            }
            var slotIds = slotIdsOf(option);
            if (slotIds.stream()
                    .anyMatch(slotId -> ambiguousSlots.contains(slotId) || assignedSlots.contains(slotId))) {
                continue;
            }
            var linkGroupId = UUID.randomUUID();
            for (var slotId : slotIds) {
                planned.add(new PlannedSelection(slotId, option.getId(), linkGroupId));
                assignedSlots.add(slotId);
            }
        }

        for (var option : defaults) {
            if (option.getId() == null || occupiesLinked(option)) {
                continue;
            }
            for (var slotId : slotIdsOf(option)) {
                if (ambiguousSlots.contains(slotId) || assignedSlots.contains(slotId)) {
                    continue;
                }
                planned.add(new PlannedSelection(slotId, option.getId(), null));
                assignedSlots.add(slotId);
            }
        }

        return planned;
    }

    /**
     * Copies a plan onto one collection model, minting fresh link-group ids so two miniatures
     * never share occupancy groups.
     */
    public static List<CollectionModelWargearSelectionEntity> selectionsFor(
            UUID collectionModelId, List<PlannedSelection> plan) {
        Map<UUID, UUID> linkGroupsByPlanId = new HashMap<>();
        List<CollectionModelWargearSelectionEntity> selections = new ArrayList<>();
        for (var planned : plan) {
            var linkGroupId =
                    planned.linkGroupId() == null
                            ? null
                            : linkGroupsByPlanId.computeIfAbsent(planned.linkGroupId(), key -> UUID.randomUUID());
            selections.add(
                    CollectionModelWargearSelectionEntity.builder()
                            .collectionModelId(collectionModelId)
                            .attachmentSlotId(planned.attachmentSlotId())
                            .wargearOptionId(planned.wargearOptionId())
                            .linkGroupId(linkGroupId)
                            .build());
        }
        return selections;
    }

    private static boolean occupiesLinked(WargearOptionEntity option) {
        return option.isDefaultLinked() && slotIdsOf(option).size() >= 2;
    }

    private static List<UUID> slotIdsOf(WargearOptionEntity option) {
        return option.getAttachmentSlots().stream()
                .map(AttachmentSlotEntity::getId)
                .filter(id -> id != null)
                .distinct()
                .toList();
    }
}

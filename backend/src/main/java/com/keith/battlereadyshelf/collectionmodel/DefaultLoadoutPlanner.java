package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.modeldefinition.AttachmentSlotEntity;
import com.keith.battlereadyshelf.modeldefinition.WargearOptionEntity;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
            for (var slotId : occupancySlotIds(option)) {
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
            var slotIds = occupancySlotIds(option);
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
            for (var slotId : occupancySlotIds(option)) {
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
        return option.isDefaultLinked() && occupancySlotIds(option).size() >= 2;
    }

    /**
     * Slots this default fills. An explicit default-slot list wins; otherwise every eligible slot
     * is occupied, which is what catalogue rows without {@code defaultSlotIds} described.
     */
    static List<UUID> occupancySlotIds(WargearOptionEntity option) {
        if (!option.isDefault()) {
            return List.of();
        }
        var eligible = idsOf(option.getAttachmentSlots());
        var specified = idsOf(option.getDefaultAttachmentSlots());
        if (specified.isEmpty()) {
            return eligible;
        }
        return specified.stream().filter(eligible::contains).toList();
    }

    private static List<UUID> idsOf(Collection<AttachmentSlotEntity> slots) {
        if (slots == null) {
            return List.of();
        }
        return slots.stream().map(AttachmentSlotEntity::getId).filter(Objects::nonNull).distinct().toList();
    }
}

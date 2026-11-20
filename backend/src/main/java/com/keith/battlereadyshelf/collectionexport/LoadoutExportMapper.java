package com.keith.battlereadyshelf.collectionexport;

import com.keith.battlereadyshelf.generated.model.CollectionExportLoadoutEntry;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Collapses a miniature's slots and filled bits into export loadout entries — the backend
 * counterpart of {@code loadoutDisplayItems.ts} / {@code modelLoadout.ts}.
 */
public final class LoadoutExportMapper {
    public record Slot(UUID id, String name) {}

    public record Selection(
            UUID attachmentSlotId,
            UUID wargearOptionId,
            String customLabel,
            UUID linkGroupId,
            Boolean equipped) {}

    private LoadoutExportMapper() {}

    public static List<CollectionExportLoadoutEntry> map(
            List<Slot> slots,
            List<Selection> selections,
            Set<UUID> magnetizedSlotIds,
            Map<UUID, String> optionNames,
            boolean includeSpares) {
        var seenGroups = new HashSet<UUID>();
        var entries = new ArrayList<CollectionExportLoadoutEntry>();

        for (var slot : slots) {
            var equipped = equippedSelection(selections, slot.id());
            var groupId = equipped != null ? equipped.linkGroupId() : null;
            if (groupId != null) {
                if (seenGroups.contains(groupId)) {
                    continue;
                }
                var partners =
                        slots.stream()
                                .filter(
                                        candidate -> {
                                            var partnerEquipped =
                                                    equippedSelection(selections, candidate.id());
                                            return partnerEquipped != null
                                                    && groupId.equals(partnerEquipped.linkGroupId());
                                        })
                                .toList();
                if (partners.size() >= 2) {
                    seenGroups.add(groupId);
                    entries.add(
                            linkedEntry(
                                    partners,
                                    equipped,
                                    selections,
                                    magnetizedSlotIds,
                                    optionNames,
                                    includeSpares));
                    continue;
                }
            }

            var entry =
                    unlinkedEntry(slot, equipped, selections, magnetizedSlotIds, optionNames, includeSpares);
            if (entry != null) {
                entries.add(entry);
            }
        }

        return entries;
    }

    private static CollectionExportLoadoutEntry linkedEntry(
            List<Slot> partners,
            Selection equipped,
            List<Selection> selections,
            Set<UUID> magnetizedSlotIds,
            Map<UUID, String> optionNames,
            boolean includeSpares) {
        var slotNames = partners.stream().map(Slot::name).toList();
        var resolved = resolveName(equipped, optionNames);
        var magnetized = partners.stream().anyMatch(partner -> magnetizedSlotIds.contains(partner.id()));
        var spares =
                includeSpares && magnetized
                        ? spareNames(partners, selections, optionNames)
                        : null;
        return new CollectionExportLoadoutEntry(slotNames, resolved.custom())
                .wargear(resolved.wargear())
                .spares(spares);
    }

    private static CollectionExportLoadoutEntry unlinkedEntry(
            Slot slot,
            Selection equipped,
            List<Selection> selections,
            Set<UUID> magnetizedSlotIds,
            Map<UUID, String> optionNames,
            boolean includeSpares) {
        var magnetized = magnetizedSlotIds.contains(slot.id());
        var spares =
                includeSpares && magnetized
                        ? spareNames(List.of(slot), selections, optionNames)
                        : null;
        if (equipped == null && (spares == null || spares.isEmpty())) {
            return null;
        }
        if (equipped == null) {
            return new CollectionExportLoadoutEntry(List.of(slot.name()), false)
                    .wargear(null)
                    .spares(spares);
        }
        var resolved = resolveName(equipped, optionNames);
        return new CollectionExportLoadoutEntry(List.of(slot.name()), resolved.custom())
                .wargear(resolved.wargear())
                .spares(spares);
    }

    private static List<String> spareNames(
            List<Slot> slots, List<Selection> selections, Map<UUID, String> optionNames) {
        var names = new ArrayList<String>();
        for (var slot : slots) {
            var bits = filledBitsForSlot(selections, slot.id());
            for (var bit : bits) {
                if (isEquippedBit(bit, bits.size())) {
                    continue;
                }
                var name = resolveName(bit, optionNames).wargear();
                if (name != null) {
                    names.add(name);
                }
            }
        }
        return names.isEmpty() ? null : names;
    }

    private static Selection equippedSelection(List<Selection> selections, UUID slotId) {
        var bits = filledBitsForSlot(selections, slotId);
        return bits.stream().filter(bit -> isEquippedBit(bit, bits.size())).findFirst().orElse(null);
    }

    private static List<Selection> filledBitsForSlot(List<Selection> selections, UUID slotId) {
        return selections.stream()
                .filter(selection -> Objects.equals(selection.attachmentSlotId(), slotId))
                .filter(LoadoutExportMapper::isFilled)
                .toList();
    }

    private static boolean isFilled(Selection selection) {
        return selection.wargearOptionId() != null || trimmed(selection.customLabel()) != null;
    }

    private static boolean isEquippedBit(Selection selection, int filledInSlot) {
        if (Boolean.TRUE.equals(selection.equipped())) {
            return true;
        }
        if (Boolean.FALSE.equals(selection.equipped())) {
            return false;
        }
        return filledInSlot == 1;
    }

    private static ResolvedName resolveName(Selection selection, Map<UUID, String> optionNames) {
        if (selection.wargearOptionId() != null) {
            var optionName = optionNames.get(selection.wargearOptionId());
            if (optionName != null && !optionName.isBlank()) {
                return new ResolvedName(optionName, false);
            }
        }
        var custom = trimmed(selection.customLabel());
        if (custom != null) {
            return new ResolvedName(custom, true);
        }
        return new ResolvedName(null, false);
    }

    private static String trimmed(String value) {
        if (value == null) {
            return null;
        }
        var trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record ResolvedName(String wargear, boolean custom) {}
}

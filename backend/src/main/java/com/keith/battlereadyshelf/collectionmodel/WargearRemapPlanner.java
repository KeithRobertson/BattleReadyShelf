package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.generated.model.AttachmentSlot;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.WargearOption;
import com.keith.battlereadyshelf.generated.model.WargearRemapOutcome;

import jakarta.annotation.Nullable;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Works out what happens to a collection model's recorded loadout when it is moved onto a different
 * model definition (e.g. onto the user's own customised version of it).
 *
 * <p>Slots and wargear are matched <em>by name</em> rather than by id, because the two definitions
 * are usually unrelated rows that happen to describe the same physical miniature. The one exception
 * is wargear that resolves to the same shared {@code WargearDefinition}, which is a stronger signal
 * than a name and is therefore tried first.
 *
 * <p>Bits that belong to an identity the miniature will still have (the old current type becoming
 * an alternate, or another alternate) keep their option ids rather than being flattened to custom
 * labels.
 *
 * <p>Planning is deliberately separate from applying it, so the exact same reasoning can be shown
 * to the user as a preview and then executed, with no chance of the two disagreeing.
 */
@Component
public class WargearRemapPlanner {

    /**
     * One existing wargear assignment and what would become of it. {@code targetSlotId} and
     * {@code targetWargearOptionId} are null exactly when the outcome makes them meaningless.
     */
    public record RemapEntry(
            String slotName,
            String wargearName,
            WargearRemapOutcome outcome,
            @Nullable UUID targetSlotId,
            @Nullable String targetSlotName,
            @Nullable UUID targetWargearOptionId,
            @Nullable String customLabel,
            @Nullable UUID linkGroupId,
            boolean equipped) {}

    public List<RemapEntry> plan(
            ModelDefinition current,
            ModelDefinition target,
            List<CollectionModelWargearSelectionEntity> selections) {
        return plan(current, target, selections, List.of());
    }

    public List<RemapEntry> plan(
            ModelDefinition current,
            ModelDefinition target,
            List<CollectionModelWargearSelectionEntity> selections,
            Collection<WargearOption> retainedOptions) {

        var currentSlotsById = slotsById(current);
        var optionsById =
                Stream.concat(optionsOf(current).stream(), retainedOptions.stream())
                        .filter(option -> option.getId() != null)
                        .collect(Collectors.toMap(WargearOption::getId, Function.identity(), (a, b) -> a));
        var retainedOptionIds =
                retainedOptions.stream().map(WargearOption::getId).filter(Objects::nonNull).collect(Collectors.toSet());
        var targetSlotsByName =
                slotsOf(target).stream()
                        .collect(Collectors.toMap(slot -> normalise(slot.getName()), Function.identity(), (a, b) -> a));

        return selections.stream()
                .map(
                        selection ->
                                planOne(
                                        selection,
                                        currentSlotsById,
                                        optionsById,
                                        retainedOptionIds,
                                        targetSlotsByName,
                                        optionsOf(target)))
                .filter(Objects::nonNull)
                .toList();
    }

    @Nullable
    private RemapEntry planOne(
            CollectionModelWargearSelectionEntity selection,
            Map<UUID, AttachmentSlot> currentSlotsById,
            Map<UUID, WargearOption> optionsById,
            java.util.Set<UUID> retainedOptionIds,
            Map<String, AttachmentSlot> targetSlotsByName,
            List<WargearOption> targetOptions) {

        var knownOption =
                selection.getWargearOptionId() == null ? null : optionsById.get(selection.getWargearOptionId());
        var wargearName = knownOption != null ? knownOption.getName() : selection.getCustomLabel();
        if (wargearName == null || wargearName.isBlank()) {
            // An empty slot carries no information, so there is nothing to remap or to warn about.
            return null;
        }

        var currentSlot = currentSlotsById.get(selection.getAttachmentSlotId());
        var slotName = currentSlot != null ? currentSlot.getName() : "Unknown slot";
        var targetSlot = targetSlotsByName.get(normalise(slotName));
        if (targetSlot == null) {
            return occupancy(
                    slotName, wargearName, WargearRemapOutcome.DROPPED, null, null, null, null, selection);
        }

        var match =
                findMatchingOption(
                        targetOptions,
                        targetSlot.getId(),
                        knownOption == null ? null : knownOption.getWargearDefinitionId(),
                        wargearName);
        if (match != null) {
            return occupancy(
                    slotName,
                    wargearName,
                    WargearRemapOutcome.MATCHED,
                    targetSlot.getId(),
                    targetSlot.getName(),
                    match.getId(),
                    null,
                    selection);
        }

        if (selection.getWargearOptionId() != null && retainedOptionIds.contains(selection.getWargearOptionId())) {
            return occupancy(
                    slotName,
                    wargearName,
                    WargearRemapOutcome.MATCHED,
                    targetSlot.getId(),
                    targetSlot.getName(),
                    selection.getWargearOptionId(),
                    null,
                    selection);
        }

        return occupancy(
                slotName,
                wargearName,
                WargearRemapOutcome.CUSTOM,
                targetSlot.getId(),
                targetSlot.getName(),
                null,
                wargearName,
                selection);
    }

    private RemapEntry occupancy(
            String slotName,
            String wargearName,
            WargearRemapOutcome outcome,
            @Nullable UUID targetSlotId,
            @Nullable String targetSlotName,
            @Nullable UUID targetWargearOptionId,
            @Nullable String customLabel,
            CollectionModelWargearSelectionEntity selection) {
        return new RemapEntry(
                slotName,
                wargearName,
                outcome,
                targetSlotId,
                targetSlotName,
                targetWargearOptionId,
                customLabel,
                selection.getLinkGroupId(),
                selection.isEquipped());
    }

    /**
     * Prefers an option backed by the same shared wargear definition, since that is the same item
     * beyond doubt, and only then falls back to matching on the displayed name.
     */
    @Nullable
    private WargearOption findMatchingOption(
            List<WargearOption> targetOptions,
            UUID targetSlotId,
            @Nullable UUID wargearDefinitionId,
            String wargearName) {

        var candidates =
                targetOptions.stream()
                        .filter(
                                option ->
                                        option.getAttachmentSlotIds() != null
                                                && option.getAttachmentSlotIds().contains(targetSlotId))
                        .toList();

        if (wargearDefinitionId != null) {
            var byDefinition =
                    candidates.stream()
                            .filter(option -> wargearDefinitionId.equals(option.getWargearDefinitionId()))
                            .findFirst();
            if (byDefinition.isPresent()) {
                return byDefinition.get();
            }
        }

        return candidates.stream()
                .filter(option -> normalise(option.getName()).equals(normalise(wargearName)))
                .findFirst()
                .orElse(null);
    }

    private Map<UUID, AttachmentSlot> slotsById(ModelDefinition modelDefinition) {
        return slotsOf(modelDefinition).stream()
                .collect(Collectors.toMap(AttachmentSlot::getId, Function.identity(), (a, b) -> a));
    }

    private List<AttachmentSlot> slotsOf(ModelDefinition modelDefinition) {
        return modelDefinition.getAttachmentSlots() == null
                ? List.of()
                : modelDefinition.getAttachmentSlots();
    }

    private List<WargearOption> optionsOf(ModelDefinition modelDefinition) {
        return modelDefinition.getWargearOptions() == null
                ? List.of()
                : modelDefinition.getWargearOptions();
    }

    private String normalise(@Nullable String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}

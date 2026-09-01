package com.keith.battlereadyshelf.collectionmodel;

import static org.assertj.core.api.Assertions.assertThat;

import com.keith.battlereadyshelf.generated.model.AttachmentSlot;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.WargearOption;
import com.keith.battlereadyshelf.generated.model.WargearRemapOutcome;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

class WargearRemapPlannerTest {

    private final WargearRemapPlanner planner = new WargearRemapPlanner();

    private static AttachmentSlot slot(UUID id, String name) {
        return new AttachmentSlot(name, "ARM").id(id);
    }

    private static WargearOption option(UUID id, UUID wargearDefinitionId, String name, UUID... slotIds) {
        return new WargearOption(name, false, List.of(slotIds)).id(id).wargearDefinitionId(wargearDefinitionId);
    }

    private static ModelDefinition definition(List<AttachmentSlot> slots, List<WargearOption> options) {
        return new ModelDefinition().id(UUID.randomUUID()).attachmentSlots(slots).wargearOptions(options);
    }

    private static CollectionModelWargearSelectionEntity selection(UUID slotId, UUID optionId, String customLabel) {
        return CollectionModelWargearSelectionEntity.builder()
                .id(UUID.randomUUID())
                .collectionModelId(UUID.randomUUID())
                .attachmentSlotId(slotId)
                .wargearOptionId(optionId)
                .customLabel(customLabel)
                .build();
    }

    @Test
    void wargearBackedByTheSameSharedDefinitionIsMatchedOntoTheEquivalentSlot() {
        var boltgun = UUID.randomUUID();
        var oldSlot = UUID.randomUUID();
        var oldOption = UUID.randomUUID();
        var newSlot = UUID.randomUUID();
        var newOption = UUID.randomUUID();

        var current =
                definition(
                        List.of(slot(oldSlot, "Right arm")),
                        List.of(option(oldOption, boltgun, "Boltgun", oldSlot)));
        // The customised copy renames nothing, but every row is a different id.
        var target =
                definition(
                        List.of(slot(newSlot, "Right arm")),
                        List.of(option(newOption, boltgun, "Boltgun", newSlot)));

        var plan = planner.plan(current, target, List.of(selection(oldSlot, oldOption, null)));

        assertThat(plan).singleElement().satisfies(entry -> {
            assertThat(entry.outcome()).isEqualTo(WargearRemapOutcome.MATCHED);
            assertThat(entry.targetSlotId()).isEqualTo(newSlot);
            assertThat(entry.targetWargearOptionId()).isEqualTo(newOption);
            assertThat(entry.customLabel()).isNull();
        });
    }

    @Test
    void wargearTheNewDefinitionDoesNotOfferIsKeptAsACustomLabel() {
        var oldSlot = UUID.randomUUID();
        var oldOption = UUID.randomUUID();
        var newSlot = UUID.randomUUID();

        var current =
                definition(
                        List.of(slot(oldSlot, "Right arm")),
                        List.of(option(oldOption, UUID.randomUUID(), "Plasma gun", oldSlot)));
        var target = definition(List.of(slot(newSlot, "Right arm")), List.of());

        var plan = planner.plan(current, target, List.of(selection(oldSlot, oldOption, null)));

        assertThat(plan).singleElement().satisfies(entry -> {
            assertThat(entry.outcome()).isEqualTo(WargearRemapOutcome.CUSTOM);
            assertThat(entry.targetSlotId()).isEqualTo(newSlot);
            assertThat(entry.targetWargearOptionId()).isNull();
            assertThat(entry.customLabel()).isEqualTo("Plasma gun");
        });
    }

    @Test
    void aCustomLabelIsPromotedToARealOptionWhenTheNewDefinitionRecognisesTheName() {
        var oldSlot = UUID.randomUUID();
        var newSlot = UUID.randomUUID();
        var newOption = UUID.randomUUID();

        var current = definition(List.of(slot(oldSlot, "Right arm")), List.of());
        var target =
                definition(
                        List.of(slot(newSlot, "Right arm")),
                        List.of(option(newOption, UUID.randomUUID(), "Plasma gun", newSlot)));

        var plan = planner.plan(current, target, List.of(selection(oldSlot, null, "  plasma GUN ")));

        assertThat(plan).singleElement().satisfies(entry -> {
            assertThat(entry.outcome()).isEqualTo(WargearRemapOutcome.MATCHED);
            assertThat(entry.targetWargearOptionId()).isEqualTo(newOption);
        });
    }

    @Test
    void wargearWhoseSlotHasNoCounterpartIsReportedAsDropped() {
        var oldSlot = UUID.randomUUID();
        var oldOption = UUID.randomUUID();

        var current =
                definition(
                        List.of(slot(oldSlot, "Backpack")),
                        List.of(option(oldOption, UUID.randomUUID(), "Jump pack", oldSlot)));
        var target = definition(List.of(slot(UUID.randomUUID(), "Right arm")), List.of());

        var plan = planner.plan(current, target, List.of(selection(oldSlot, oldOption, null)));

        assertThat(plan).singleElement().satisfies(entry -> {
            assertThat(entry.outcome()).isEqualTo(WargearRemapOutcome.DROPPED);
            assertThat(entry.slotName()).isEqualTo("Backpack");
            assertThat(entry.wargearName()).isEqualTo("Jump pack");
            assertThat(entry.targetSlotId()).isNull();
        });
    }

    @Test
    void anOptionIsOnlyMatchedWhenItActuallyCoversTheDestinationSlot() {
        var boltgun = UUID.randomUUID();
        var oldSlot = UUID.randomUUID();
        var oldOption = UUID.randomUUID();
        var newRightArm = UUID.randomUUID();
        var newLeftArm = UUID.randomUUID();

        var current =
                definition(
                        List.of(slot(oldSlot, "Right arm")),
                        List.of(option(oldOption, boltgun, "Boltgun", oldSlot)));
        // The same wargear exists on the new definition, but only in the other arm.
        var target =
                definition(
                        List.of(slot(newRightArm, "Right arm"), slot(newLeftArm, "Left arm")),
                        List.of(option(UUID.randomUUID(), boltgun, "Boltgun", newLeftArm)));

        var plan = planner.plan(current, target, List.of(selection(oldSlot, oldOption, null)));

        assertThat(plan).singleElement().satisfies(entry -> {
            assertThat(entry.outcome()).isEqualTo(WargearRemapOutcome.CUSTOM);
            assertThat(entry.targetSlotId()).isEqualTo(newRightArm);
            assertThat(entry.customLabel()).isEqualTo("Boltgun");
        });
    }

    @Test
    void emptySlotsAreNotReportedSinceTheyCarryNothingToLose() {
        var oldSlot = UUID.randomUUID();
        var current = definition(List.of(slot(oldSlot, "Right arm")), List.of());
        var target = definition(List.of(), List.of());

        var plan = planner.plan(current, target, List.of(selection(oldSlot, null, null)));

        assertThat(plan).isEmpty();
    }

    @Test
    void slotNamesAreMatchedIgnoringCaseAndSurroundingWhitespace() {
        var oldSlot = UUID.randomUUID();
        var newSlot = UUID.randomUUID();

        var current = definition(List.of(slot(oldSlot, " Right Arm ")), List.of());
        var target = definition(List.of(slot(newSlot, "right arm")), List.of());

        var plan = planner.plan(current, target, List.of(selection(oldSlot, null, "Chainsword")));

        assertThat(plan).singleElement().satisfies(entry -> {
            assertThat(entry.outcome()).isEqualTo(WargearRemapOutcome.CUSTOM);
            assertThat(entry.targetSlotId()).isEqualTo(newSlot);
        });
    }
}

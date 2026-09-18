package com.keith.battlereadyshelf.collectionmodel;

import static org.assertj.core.api.Assertions.assertThat;

import com.keith.battlereadyshelf.modeldefinition.AttachmentSlotEntity;
import com.keith.battlereadyshelf.modeldefinition.WargearOptionEntity;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

class DefaultLoadoutPlannerTest {
    private final UUID leftId = UUID.randomUUID();
    private final UUID rightId = UUID.randomUUID();
    private final AttachmentSlotEntity left = slot(leftId, "Left Arm");
    private final AttachmentSlotEntity right = slot(rightId, "Right Arm");

    @Test
    void fillsEachSlotWithItsOnlyDefault() {
        var boltgun = option("boltgun", false, left);
        var knife = option("knife", false, right);

        assertThat(DefaultLoadoutPlanner.plan(List.of(boltgun, knife)))
                .containsExactly(
                        new DefaultLoadoutPlanner.PlannedSelection(leftId, boltgun.getId(), null),
                        new DefaultLoadoutPlanner.PlannedSelection(rightId, knife.getId(), null));
    }

    @Test
    void leavesASlotEmptyWhenTwoDefaultsCompeteForIt() {
        var boltgun = option("boltgun", false, left, right);
        var knife = option("knife", false, left, right);

        assertThat(DefaultLoadoutPlanner.plan(List.of(boltgun, knife))).isEmpty();
    }

    @Test
    void fillsEveryEligibleSlotIndependentlyWhenOneDefaultIsNotLinked() {
        var knives = option("knife", false, left, right);

        assertThat(DefaultLoadoutPlanner.plan(List.of(knives)))
                .containsExactly(
                        new DefaultLoadoutPlanner.PlannedSelection(leftId, knives.getId(), null),
                        new DefaultLoadoutPlanner.PlannedSelection(rightId, knives.getId(), null));
    }

    @Test
    void linksATwoHandedDefaultAcrossItsSlots() {
        var cleaver = option("cleaver", true, left, right);

        var planned = DefaultLoadoutPlanner.plan(List.of(cleaver));

        assertThat(planned).hasSize(2);
        assertThat(planned)
                .allSatisfy(
                        selection -> {
                            assertThat(selection.wargearOptionId()).isEqualTo(cleaver.getId());
                            assertThat(selection.linkGroupId()).isNotNull();
                        });
        assertThat(planned.getFirst().linkGroupId()).isEqualTo(planned.getLast().linkGroupId());
        assertThat(planned)
                .extracting(DefaultLoadoutPlanner.PlannedSelection::attachmentSlotId)
                .containsExactly(leftId, rightId);
    }

    @Test
    void skipsALinkedDefaultWhenAnotherDefaultAlsoClaimsOneOfItsSlots() {
        var cleaver = option("cleaver", true, left, right);
        var pistol = option("pistol", false, left);

        assertThat(DefaultLoadoutPlanner.plan(List.of(cleaver, pistol))).isEmpty();
    }

    @Test
    void ignoresNonDefaultOptions() {
        var spare = option("spare", false, left);
        spare.setDefault(false);

        assertThat(DefaultLoadoutPlanner.plan(List.of(spare))).isEmpty();
    }

    @Test
    void selectionsForMintsAFreshLinkGroupPerModel() {
        var cleaver = option("cleaver", true, left, right);
        var plan = DefaultLoadoutPlanner.plan(List.of(cleaver));
        var firstModel = UUID.randomUUID();
        var secondModel = UUID.randomUUID();

        var first = DefaultLoadoutPlanner.selectionsFor(firstModel, plan);
        var second = DefaultLoadoutPlanner.selectionsFor(secondModel, plan);

        assertThat(first)
                .extracting(CollectionModelWargearSelectionEntity::getLinkGroupId)
                .doesNotContainNull()
                .doesNotContainAnyElementsOf(
                        second.stream().map(CollectionModelWargearSelectionEntity::getLinkGroupId).toList());
        assertThat(first)
                .allSatisfy(selection -> assertThat(selection.getCollectionModelId()).isEqualTo(firstModel));
    }

    private static AttachmentSlotEntity slot(UUID id, String name) {
        return AttachmentSlotEntity.builder().id(id).name(name).type("arm").build();
    }

    private WargearOptionEntity option(String name, boolean defaultLinked, AttachmentSlotEntity... slots) {
        return WargearOptionEntity.builder()
                .id(UUID.randomUUID())
                .wargearDefinition(
                        com.keith.battlereadyshelf.modeldefinition.WargearDefinitionEntity.builder()
                                .id(UUID.randomUUID())
                                .name(name)
                                .build())
                .isDefault(true)
                .defaultLinked(defaultLinked)
                .attachmentSlots(List.of(slots))
                .build();
    }
}

package com.keith.battlereadyshelf.collectionexport;

import static org.assertj.core.api.Assertions.assertThat;

import com.keith.battlereadyshelf.collectionexport.LoadoutExportMapper.Selection;
import com.keith.battlereadyshelf.collectionexport.LoadoutExportMapper.Slot;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

class LoadoutExportMapperTest {

    @Test
    void collapsesLinkedSlotsIntoOneEntry() {
        var left = UUID.randomUUID();
        var right = UUID.randomUUID();
        var optionId = UUID.randomUUID();
        var groupId = UUID.randomUUID();

        var entries =
                LoadoutExportMapper.map(
                        List.of(new Slot(left, "Left hand"), new Slot(right, "Right hand")),
                        List.of(
                                new Selection(left, optionId, null, groupId, true),
                                new Selection(right, optionId, null, groupId, true)),
                        Set.of(),
                        Map.of(optionId, "Plague spewer"),
                        true);

        assertThat(entries).hasSize(1);
        assertThat(entries.getFirst().getSlots()).containsExactly("Left hand", "Right hand");
        assertThat(entries.getFirst().getWargear()).isEqualTo("Plague spewer");
        assertThat(entries.getFirst().getCustom()).isFalse();
    }

    @Test
    void usesCustomLabelAsWargear() {
        var slotId = UUID.randomUUID();

        var entries =
                LoadoutExportMapper.map(
                        List.of(new Slot(slotId, "Right hand")),
                        List.of(new Selection(slotId, null, "Kitbashed claw", null, true)),
                        Set.of(),
                        Map.of(),
                        true);

        assertThat(entries).hasSize(1);
        assertThat(entries.getFirst().getSlots()).containsExactly("Right hand");
        assertThat(entries.getFirst().getWargear()).isEqualTo("Kitbashed claw");
        assertThat(entries.getFirst().getCustom()).isTrue();
        assertThat(entries.getFirst().getSpares()).isNull();
    }

    @Test
    void listsSparesOnMagnetisedSlotWithEquippedBit() {
        var slotId = UUID.randomUUID();
        var equippedId = UUID.randomUUID();
        var spareId = UUID.randomUUID();

        var entries =
                LoadoutExportMapper.map(
                        List.of(new Slot(slotId, "Right hand")),
                        List.of(
                                new Selection(slotId, equippedId, null, null, true),
                                new Selection(slotId, spareId, null, null, false)),
                        Set.of(slotId),
                        Map.of(equippedId, "Plague spewer", spareId, "Blight launcher"),
                        true);

        assertThat(entries).hasSize(1);
        assertThat(entries.getFirst().getWargear()).isEqualTo("Plague spewer");
        assertThat(entries.getFirst().getCustom()).isFalse();
        assertThat(entries.getFirst().getSpares()).containsExactly("Blight launcher");
    }

    @Test
    void emitsSparesOnlySlotWhenNothingEquipped() {
        var slotId = UUID.randomUUID();
        var spareId = UUID.randomUUID();

        var entries =
                LoadoutExportMapper.map(
                        List.of(new Slot(slotId, "Backpack")),
                        List.of(new Selection(slotId, spareId, null, null, false)),
                        Set.of(slotId),
                        Map.of(spareId, "Icon of Despair"),
                        true);

        assertThat(entries).hasSize(1);
        assertThat(entries.getFirst().getSlots()).containsExactly("Backpack");
        assertThat(entries.getFirst().getWargear()).isNull();
        assertThat(entries.getFirst().getCustom()).isFalse();
        assertThat(entries.getFirst().getSpares()).containsExactly("Icon of Despair");
    }

    @Test
    void omitsEmptySlotWithNoSpares() {
        var slotId = UUID.randomUUID();

        var entries =
                LoadoutExportMapper.map(
                        List.of(new Slot(slotId, "Left hand")),
                        List.of(),
                        Set.of(),
                        Map.of(),
                        true);

        assertThat(entries).isEmpty();
    }

    @Test
    void omitsSparesAndSparesOnlySlotsWhenIncludeSparesIsFalse() {
        var equippedSlot = UUID.randomUUID();
        var sparesOnlySlot = UUID.randomUUID();
        var equippedId = UUID.randomUUID();
        var spareId = UUID.randomUUID();
        var orphanSpareId = UUID.randomUUID();

        var entries =
                LoadoutExportMapper.map(
                        List.of(
                                new Slot(equippedSlot, "Right hand"),
                                new Slot(sparesOnlySlot, "Backpack")),
                        List.of(
                                new Selection(equippedSlot, equippedId, null, null, true),
                                new Selection(equippedSlot, spareId, null, null, false),
                                new Selection(sparesOnlySlot, orphanSpareId, null, null, false)),
                        Set.of(equippedSlot, sparesOnlySlot),
                        Map.of(
                                equippedId,
                                "Plague spewer",
                                spareId,
                                "Blight launcher",
                                orphanSpareId,
                                "Icon of Despair"),
                        false);

        assertThat(entries).hasSize(1);
        assertThat(entries.getFirst().getSlots()).containsExactly("Right hand");
        assertThat(entries.getFirst().getWargear()).isEqualTo("Plague spewer");
        assertThat(entries.getFirst().getSpares()).isNull();
    }
}

package com.keith.battlereadyshelf.modeldefinition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.error.ConflictException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.AttachmentSlot;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.WargearOption;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class ModelDefinitionsServiceTest {
    @Mock private ModelDefinitionRepository modelDefinitionRepository;
    @Mock private AttachmentSlotRepository attachmentSlotRepository;
    @Mock private WargearOptionRepository wargearOptionRepository;
    @Mock private CollectionModelRepository collectionModelRepository;
    @Mock private FactionRepository factionRepository;

    private ModelDefinitionsService modelDefinitionsService;

    @BeforeEach
    void setUp() {
        modelDefinitionsService =
                new ModelDefinitionsService(
                        modelDefinitionRepository,
                        attachmentSlotRepository,
                        wargearOptionRepository,
                        new ModelDefinitionMapperImpl(),
                        collectionModelRepository,
                        factionRepository);
    }

    @Test
    void getAllModelDefinitions_returnsAllModelDefinitions() {
        var poxwalkerId = UUID.randomUUID();
        when(modelDefinitionRepository.findAll())
                .thenReturn(
                        List.of(
                                ModelDefinitionEntity.builder()
                                        .id(poxwalkerId)
                                        .name("Poxwalker")
                                        .build()));
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(poxwalkerId)))
                .thenReturn(List.of());
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(poxwalkerId)))
                .thenReturn(List.of());

        var modelDefinitions = modelDefinitionsService.getAllModelDefinitions();

        assertThat(modelDefinitions)
                .containsExactly(
                        new ModelDefinition("Poxwalker")
                                .id(poxwalkerId)
                                .version(1)
                                .attachmentSlots(List.of())
                                .wargearOptions(List.of()));
    }

    @Test
    void getAllModelDefinitions_includesAttachmentSlotsAndWargearOptions() {
        var plagueMarineId = UUID.randomUUID();
        var leftArmId = UUID.randomUUID();
        var rightArmId = UUID.randomUUID();
        var boltgunId = UUID.randomUUID();

        when(modelDefinitionRepository.findAll())
                .thenReturn(
                        List.of(
                                ModelDefinitionEntity.builder()
                                        .id(plagueMarineId)
                                        .name("Plague Marine")
                                        .build()));

        var leftArm =
                AttachmentSlotEntity.builder()
                        .id(leftArmId)
                        .modelDefinitionId(plagueMarineId)
                        .name("Left Arm")
                        .build();
        var rightArm =
                AttachmentSlotEntity.builder()
                        .id(rightArmId)
                        .modelDefinitionId(plagueMarineId)
                        .name("Right Arm")
                        .build();
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(plagueMarineId)))
                .thenReturn(List.of(leftArm, rightArm));

        var boltgun =
                WargearOptionEntity.builder()
                        .id(boltgunId)
                        .modelDefinitionId(plagueMarineId)
                        .name("Boltgun")
                        .isDefault(true)
                        .attachmentSlots(List.of(leftArm))
                        .build();
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(plagueMarineId)))
                .thenReturn(List.of(boltgun));

        var modelDefinitions = modelDefinitionsService.getAllModelDefinitions();

        assertThat(modelDefinitions)
                .containsExactly(
                        new ModelDefinition("Plague Marine")
                                .id(plagueMarineId)
                                .version(1)
                                .attachmentSlots(
                                        List.of(
                                                new AttachmentSlot("Left Arm").id(leftArmId),
                                                new AttachmentSlot("Right Arm").id(rightArmId)))
                                .wargearOptions(
                                        List.of(
                                                new WargearOption("Boltgun", true, List.of(leftArmId))
                                                        .id(boltgunId))));
    }

    @Test
    void deleteModelDefinition_deletesWhenNotInUse() {
        var modelDefinitionId = UUID.randomUUID();
        when(modelDefinitionRepository.existsById(modelDefinitionId)).thenReturn(true);
        when(collectionModelRepository.countByModelDefinitionId(modelDefinitionId)).thenReturn(0L);

        modelDefinitionsService.deleteModelDefinition(modelDefinitionId);

        verify(modelDefinitionRepository).deleteById(modelDefinitionId);
    }

    @Test
    void deleteModelDefinition_throwsNotFoundWhenMissing() {
        var modelDefinitionId = UUID.randomUUID();
        when(modelDefinitionRepository.existsById(modelDefinitionId)).thenReturn(false);

        assertThatThrownBy(() -> modelDefinitionsService.deleteModelDefinition(modelDefinitionId))
                .isInstanceOf(NotFoundException.class);
        verify(modelDefinitionRepository, never()).deleteById(modelDefinitionId);
    }

    @Test
    void deleteModelDefinition_throwsConflictWhenStillInUse() {
        var modelDefinitionId = UUID.randomUUID();
        when(modelDefinitionRepository.existsById(modelDefinitionId)).thenReturn(true);
        when(collectionModelRepository.countByModelDefinitionId(modelDefinitionId)).thenReturn(3L);

        assertThatThrownBy(() -> modelDefinitionsService.deleteModelDefinition(modelDefinitionId))
                .isInstanceOf(ConflictException.class);
        verify(modelDefinitionRepository, never()).deleteById(modelDefinitionId);
    }
}


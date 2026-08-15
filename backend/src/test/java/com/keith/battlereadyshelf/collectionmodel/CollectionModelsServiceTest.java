package com.keith.battlereadyshelf.collectionmodel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import static java.time.Month.JUNE;

import com.keith.battlereadyshelf.armycollection.ArmyCollectionEntity;
import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.CollectionModel;
import com.keith.battlereadyshelf.generated.model.CollectionModelStatus;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionEntity;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionMapperImpl;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionRepository;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionsService;
import com.keith.battlereadyshelf.storage.PresignedUrlService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class CollectionModelsServiceTest {
    @Mock private CollectionModelRepository collectionModelRepository;
    @Mock private ArmyCollectionRepository armyCollectionRepository;
    @Mock private ModelDefinitionRepository modelDefinitionRepository;
    @Mock private CollectionModelImageRepository collectionModelImageRepository;

    @Mock
    private CollectionModelWargearSelectionRepository collectionModelWargearSelectionRepository;

    @Mock private ModelDefinitionsService modelDefinitionsService;
    @Mock private PresignedUrlService presignedUrlService;

    @Captor private ArgumentCaptor<CollectionModelEntity> collectionModelEntityCaptor;
    @Captor private ArgumentCaptor<List<CollectionModelWargearSelectionEntity>> selectionCaptor;

    private CollectionModelsService collectionModelsService;

    @BeforeEach
    void setUp() {
        lenient()
                .when(collectionModelImageRepository.findAllByCollectionModelId(any()))
                .thenReturn(List.of());
        lenient()
                .when(collectionModelWargearSelectionRepository.findAllByCollectionModelId(any()))
                .thenReturn(List.of());
        lenient()
                .when(modelDefinitionsService.enrichWithAttachmentSlotsAndWargearOptions(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        collectionModelsService =
                new CollectionModelsService(
                        collectionModelRepository,
                        armyCollectionRepository,
                        modelDefinitionRepository,
                        collectionModelImageRepository,
                        collectionModelWargearSelectionRepository,
                        new CollectionModelMapperImpl(new ModelDefinitionMapperImpl()),
                        new CollectionModelImageMapperImpl(),
                        modelDefinitionsService,
                        presignedUrlService);
    }

    @Test
    void getCollectionModels_returnsModelsForOwnedArmyCollection() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var poxwalkerId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
        when(collectionModelRepository.findAllByArmyCollectionId(armyCollectionId))
                .thenReturn(
                        List.of(
                                CollectionModelEntity.builder()
                                        .id(collectionModelId)
                                        .armyCollectionId(armyCollectionId)
                                        .modelDefinition(
                                                ModelDefinitionEntity.builder()
                                                        .id(poxwalkerId)
                                                        .name("Poxwalker")
                                                        .build())
                                        .name("My Poxwalker")
                                        .build()));

        var collectionModels =
                collectionModelsService.getCollectionModels(userId, armyCollectionId);

        assertThat(collectionModels)
                .containsExactly(
                        new CollectionModel(poxwalkerId)
                                .id(collectionModelId)
                                .modelDefinition(new ModelDefinition("Poxwalker").id(poxwalkerId))
                                .name("My Poxwalker")
                                .images(List.of())
                                .status(CollectionModelStatus.BOXED)
                                .wargearSelections(List.of()));
    }

    @Test
    void getCollectionModels_throwsNotFound_whenArmyCollectionNotOwnedByUser() {
        var userId = UUID.randomUUID();
        var otherUserId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(otherUserId)
                                        .name("Someone else's collection")
                                        .build()));

        assertThatThrownBy(
                        () -> collectionModelsService.getCollectionModels(userId, armyCollectionId))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void getCollectionModels_throwsNotFound_whenArmyCollectionDoesNotExist() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId)).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () -> collectionModelsService.getCollectionModels(userId, armyCollectionId))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void createCollectionModel_persistsModelForOwnedArmyCollection() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var poxwalkerId = UUID.randomUUID();
        var createdId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
        when(modelDefinitionRepository.findById(poxwalkerId))
                .thenReturn(
                        Optional.of(
                                ModelDefinitionEntity.builder()
                                        .id(poxwalkerId)
                                        .name("Poxwalker")
                                        .build()));
        when(collectionModelRepository.save(any(CollectionModelEntity.class)))
                .thenAnswer(
                        invocation -> {
                            CollectionModelEntity entity = invocation.getArgument(0);
                            entity.setId(createdId);
                            return entity;
                        });

        var createdCollectionModel =
                collectionModelsService.createCollectionModel(
                        userId,
                        armyCollectionId,
                        new CollectionModel(poxwalkerId)
                                .name("My Poxwalker")
                                .description("Freshly painted"));

        verify(collectionModelRepository).save(collectionModelEntityCaptor.capture());
        assertThat(collectionModelEntityCaptor.getValue().getArmyCollectionId())
                .isEqualTo(armyCollectionId);
        assertThat(collectionModelEntityCaptor.getValue().getModelDefinition().getId())
                .isEqualTo(poxwalkerId);
        assertThat(createdCollectionModel)
                .isEqualTo(
                        new CollectionModel(poxwalkerId)
                                .id(createdId)
                                .modelDefinition(new ModelDefinition("Poxwalker").id(poxwalkerId))
                                .name("My Poxwalker")
                                .description("Freshly painted")
                                .images(List.of())
                                .status(CollectionModelStatus.BOXED)
                                .wargearSelections(List.of()));
    }

    @Test
    void createCollectionModel_throwsNotFound_whenModelDefinitionDoesNotExist() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var unknownModelDefinitionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
        when(modelDefinitionRepository.findById(unknownModelDefinitionId))
                .thenReturn(Optional.empty());
        var collectionModel = new CollectionModel(unknownModelDefinitionId);

        assertThatThrownBy(
                        () ->
                                collectionModelsService.createCollectionModel(
                                        userId, armyCollectionId, collectionModel))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void bulkCreateCollectionModels_persistsRequestedCountOfUnnamedModels() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var poxwalkerId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
        when(modelDefinitionRepository.findById(poxwalkerId))
                .thenReturn(
                        Optional.of(
                                ModelDefinitionEntity.builder()
                                        .id(poxwalkerId)
                                        .name("Poxwalker")
                                        .build()));
        when(collectionModelRepository.saveAll(any()))
                .thenAnswer(
                        invocation -> {
                            List<CollectionModelEntity> entities = invocation.getArgument(0);
                            entities.forEach(e -> e.setId(UUID.randomUUID()));
                            return entities;
                        });

        var createdCollectionModels =
                collectionModelsService.bulkCreateCollectionModels(
                        userId, armyCollectionId, poxwalkerId, 60);

        assertThat(createdCollectionModels)
                .hasSize(60)
                .allSatisfy(
                        model -> {
                            assertThat(model.getId()).isNotNull();
                            assertThat(model.getModelDefinitionId()).isEqualTo(poxwalkerId);
                            assertThat(model.getName()).isNull();
                        });
    }

    @Test
    void bulkCreateCollectionModels_throwsNotFound_whenArmyCollectionNotOwnedByUser() {
        var userId = UUID.randomUUID();
        var otherUserId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var poxwalkerId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(otherUserId)
                                        .name("Someone else's collection")
                                        .build()));

        assertThatThrownBy(
                        () ->
                                collectionModelsService.bulkCreateCollectionModels(
                                        userId, armyCollectionId, poxwalkerId, 10))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void bulkCreateCollectionModels_throwsNotFound_whenModelDefinitionDoesNotExist() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var unknownModelDefinitionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
        when(modelDefinitionRepository.findById(unknownModelDefinitionId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                collectionModelsService.bulkCreateCollectionModels(
                                        userId, armyCollectionId, unknownModelDefinitionId, 10))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateCollectionModel_updatesNameAndDescription_whenModelIsOwned() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var poxwalkerId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();
        when(collectionModelRepository.findById(collectionModelId))
                .thenReturn(
                        Optional.of(
                                CollectionModelEntity.builder()
                                        .id(collectionModelId)
                                        .armyCollectionId(armyCollectionId)
                                        .modelDefinition(
                                                ModelDefinitionEntity.builder()
                                                        .id(poxwalkerId)
                                                        .name("Poxwalker")
                                                        .build())
                                        .build()));
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
        when(collectionModelRepository.save(any(CollectionModelEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var updated =
                collectionModelsService.updateCollectionModel(
                        userId, collectionModelId, "Poxwalker #1", "Front rank", null, null, null);

        assertThat(updated.getName()).isEqualTo("Poxwalker #1");
        assertThat(updated.getDescription()).isEqualTo("Front rank");
    }

    @Test
    void updateCollectionModel_updatesFinishedOn_whenModelIsOwned() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();
        when(collectionModelRepository.findById(collectionModelId))
                .thenReturn(
                        Optional.of(
                                CollectionModelEntity.builder()
                                        .id(collectionModelId)
                                        .armyCollectionId(armyCollectionId)
                                        .build()));
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
        when(collectionModelRepository.save(any(CollectionModelEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var finishedOn = LocalDate.of(2025, JUNE, 1);
        var updated =
                collectionModelsService.updateCollectionModel(
                        userId, collectionModelId, null, null, finishedOn, null, null);

        assertThat(updated.getFinishedOn()).isEqualTo(finishedOn);
    }

    @Test
    void updateCollectionModel_leavesFieldUnchanged_whenNotProvided() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var poxwalkerId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();
        when(collectionModelRepository.findById(collectionModelId))
                .thenReturn(
                        Optional.of(
                                CollectionModelEntity.builder()
                                        .id(collectionModelId)
                                        .armyCollectionId(armyCollectionId)
                                        .modelDefinition(
                                                ModelDefinitionEntity.builder()
                                                        .id(poxwalkerId)
                                                        .name("Poxwalker")
                                                        .build())
                                        .description("Original description")
                                        .build()));
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
        when(collectionModelRepository.save(any(CollectionModelEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var updated =
                collectionModelsService.updateCollectionModel(
                        userId, collectionModelId, "Poxwalker #1", null, null, null, null);

        assertThat(updated.getName()).isEqualTo("Poxwalker #1");
        assertThat(updated.getDescription()).isEqualTo("Original description");
    }

    @Test
    void updateCollectionModel_replacesWargearSelections_whenProvided() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var plagueMarineId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();
        var leftArmId = UUID.randomUUID();
        var boltgunId = UUID.randomUUID();
        when(collectionModelRepository.findById(collectionModelId))
                .thenReturn(
                        Optional.of(
                                CollectionModelEntity.builder()
                                        .id(collectionModelId)
                                        .armyCollectionId(armyCollectionId)
                                        .modelDefinition(
                                                ModelDefinitionEntity.builder()
                                                        .id(plagueMarineId)
                                                        .name("Plague Marine")
                                                        .build())
                                        .build()));
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
        when(collectionModelRepository.save(any(CollectionModelEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var wargearSelections =
                List.of(
                        new com.keith.battlereadyshelf.generated.model.WargearSelection(leftArmId)
                                .wargearOptionId(boltgunId));

        collectionModelsService.updateCollectionModel(
                userId, collectionModelId, null, null, null, null, wargearSelections);

        verify(collectionModelWargearSelectionRepository)
                .deleteAllByCollectionModelId(collectionModelId);
        verify(collectionModelWargearSelectionRepository).saveAll(selectionCaptor.capture());
        var savedSelections = selectionCaptor.getValue();
        assertThat(savedSelections)
                .containsExactly(
                        CollectionModelWargearSelectionEntity.builder()
                                .collectionModelId(collectionModelId)
                                .attachmentSlotId(leftArmId)
                                .wargearOptionId(boltgunId)
                                .build());
    }

    @Test
    void updateCollectionModel_throwsNotFound_whenModelNotOwnedByUser() {
        var userId = UUID.randomUUID();
        var otherUserId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();
        when(collectionModelRepository.findById(collectionModelId))
                .thenReturn(
                        Optional.of(
                                CollectionModelEntity.builder()
                                        .id(collectionModelId)
                                        .armyCollectionId(armyCollectionId)
                                        .build()));
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(otherUserId)
                                        .name("Someone else's collection")
                                        .build()));

        assertThatThrownBy(
                        () ->
                                collectionModelsService.updateCollectionModel(
                                        userId,
                                        collectionModelId,
                                        "New name",
                                        null,
                                        null,
                                        null,
                                        null))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void deleteCollectionModel_deletesModelAndCleansUpImages_whenModelIsOwned() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();
        var imageId = UUID.randomUUID();
        var collectionModel =
                CollectionModelEntity.builder()
                        .id(collectionModelId)
                        .armyCollectionId(armyCollectionId)
                        .build();
        var image =
                CollectionModelImageEntity.builder()
                        .id(imageId)
                        .collectionModelId(collectionModelId)
                        .original(ImageVariant.builder().storageKey("original-key").build())
                        .large(ImageVariant.builder().storageKey("large-key").build())
                        .thumbnail(ImageVariant.builder().storageKey("thumbnail-key").build())
                        .build();
        when(collectionModelRepository.findById(collectionModelId))
                .thenReturn(Optional.of(collectionModel));
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
        when(collectionModelImageRepository.findAllByCollectionModelId(collectionModelId))
                .thenReturn(List.of(image));

        collectionModelsService.deleteCollectionModel(userId, collectionModelId);

        verify(presignedUrlService).deleteObject("original-key");
        verify(presignedUrlService).deleteObject("large-key");
        verify(presignedUrlService).deleteObject("thumbnail-key");
        verify(collectionModelImageRepository).deleteAll(List.of(image));
        verify(collectionModelRepository).delete(collectionModel);
    }

    @Test
    void deleteCollectionModel_throwsNotFound_whenModelNotOwnedByUser() {
        var userId = UUID.randomUUID();
        var otherUserId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();
        when(collectionModelRepository.findById(collectionModelId))
                .thenReturn(
                        Optional.of(
                                CollectionModelEntity.builder()
                                        .id(collectionModelId)
                                        .armyCollectionId(armyCollectionId)
                                        .build()));
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(otherUserId)
                                        .name("Someone else's collection")
                                        .build()));

        assertThatThrownBy(
                        () ->
                                collectionModelsService.deleteCollectionModel(
                                        userId, collectionModelId))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void bulkDeleteCollectionModels_deletesOnlyModelsBelongingToArmyCollection() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var ownedModelId = UUID.randomUUID();
        var otherArmyCollectionModelId = UUID.randomUUID();
        var ownedModel =
                CollectionModelEntity.builder()
                        .id(ownedModelId)
                        .armyCollectionId(armyCollectionId)
                        .build();
        var otherModel =
                CollectionModelEntity.builder()
                        .id(otherArmyCollectionModelId)
                        .armyCollectionId(UUID.randomUUID())
                        .build();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
        when(collectionModelRepository.findAllById(
                        List.of(ownedModelId, otherArmyCollectionModelId)))
                .thenReturn(List.of(ownedModel, otherModel));

        collectionModelsService.bulkDeleteCollectionModels(
                userId, armyCollectionId, List.of(ownedModelId, otherArmyCollectionModelId));

        verify(collectionModelRepository).delete(ownedModel);
        verify(collectionModelRepository, never()).delete(otherModel);
    }

    @Test
    void bulkDeleteCollectionModels_throwsNotFound_whenArmyCollectionNotOwnedByUser() {
        var userId = UUID.randomUUID();
        var otherUserId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(otherUserId)
                                        .name("Someone else's collection")
                                        .build()));

        var collectionModelIds = List.of(UUID.randomUUID());
        assertThatThrownBy(
                        () ->
                                collectionModelsService.bulkDeleteCollectionModels(
                                        userId, armyCollectionId, collectionModelIds))
                .isInstanceOf(NotFoundException.class);
    }
}

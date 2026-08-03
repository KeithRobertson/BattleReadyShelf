package com.keith.battlereadyshelf.collectionmodel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.armycollection.ArmyCollectionEntity;
import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.CollectionModel;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionEntity;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionMapperImpl;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class CollectionModelsServiceTest {
    @Mock private CollectionModelRepository collectionModelRepository;
    @Mock private ArmyCollectionRepository armyCollectionRepository;
    @Mock private ModelDefinitionRepository modelDefinitionRepository;

    @Captor private ArgumentCaptor<CollectionModelEntity> collectionModelEntityCaptor;

    private CollectionModelsService collectionModelsService;

    @BeforeEach
    void setUp() {
        collectionModelsService =
                new CollectionModelsService(
                        collectionModelRepository,
                        armyCollectionRepository,
                        modelDefinitionRepository,
                        new CollectionModelMapperImpl(new ModelDefinitionMapperImpl()));
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
                                .name("My Poxwalker"));
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
                                .description("Freshly painted"));
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
}

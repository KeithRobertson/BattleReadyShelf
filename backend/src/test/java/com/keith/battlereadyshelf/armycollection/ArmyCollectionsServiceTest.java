package com.keith.battlereadyshelf.armycollection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.generated.model.ArmyCollection;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class ArmyCollectionsServiceTest {
    @Mock private ArmyCollectionRepository armyCollectionRepository;
    @Mock private CollectionModelRepository collectionModelRepository;
    @Mock private ModelDefinitionGroupPositionRepository modelDefinitionGroupPositionRepository;

    @Captor private ArgumentCaptor<ArmyCollectionEntity> armyCollectionEntityCaptor;

    private ArmyCollectionsService armyCollectionsService;

    @BeforeEach
    void setUp() {
        armyCollectionsService =
                new ArmyCollectionsService(
                        armyCollectionRepository,
                        collectionModelRepository,
                        modelDefinitionGroupPositionRepository,
                        new ArmyCollectionMapperImpl());
        lenient()
                .when(
                        modelDefinitionGroupPositionRepository
                                .findByArmyCollectionIdOrderByDisplayOrderAsc(any()))
                .thenReturn(List.of());
    }

    @Test
    void getAllArmyCollections_returnsOnlyCollectionsForAuthenticatedUser() {
        var userId = UUID.randomUUID();
        when(armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId))
                .thenReturn(
                        List.of(
                                ArmyCollectionEntity.builder()
                                        .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .description("Stored collection")
                                        .build()));

        var armyCollections = armyCollectionsService.getAllArmyCollections(userId);

        assertThat(armyCollections)
                .containsExactly(
                        new ArmyCollection("Starter Collection")
                                .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                                .description("Stored collection")
                                .modelCount(0)
                                .modelCountsByStatus(Map.of())
                                .modelDefinitionOrder(List.of()));
        verify(armyCollectionRepository).findAllByUserIdOrderByDisplayOrderAsc(userId);
    }

    @Test
    void createArmyCollection_persistsCollectionForAuthenticatedUser() {
        var userId = UUID.randomUUID();
        when(armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId))
                .thenReturn(List.of());
        when(armyCollectionRepository.save(any(ArmyCollectionEntity.class)))
                .thenAnswer(
                        invocation -> {
                            ArmyCollectionEntity entity = invocation.getArgument(0);
                            entity.setId(UUID.fromString("22222222-2222-2222-2222-222222222222"));
                            return entity;
                        });

        var createdArmyCollection =
                armyCollectionsService.createArmyCollection(
                        userId,
                        new ArmyCollection("Test Collection").description("Test Description"));

        verify(armyCollectionRepository).save(armyCollectionEntityCaptor.capture());
        assertThat(armyCollectionEntityCaptor.getValue().getUserId()).isEqualTo(userId);
        assertThat(armyCollectionEntityCaptor.getValue().getName()).isEqualTo("Test Collection");
        assertThat(createdArmyCollection)
                .isEqualTo(
                        new ArmyCollection("Test Collection")
                                .id(UUID.fromString("22222222-2222-2222-2222-222222222222"))
                                .description("Test Description")
                                .modelCount(0)
                                .modelCountsByStatus(Map.of())
                                .modelDefinitionOrder(List.of()));
    }

    @Test
    void getArmyCollection_returnsCollection_whenOwnedByUser() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .description("Stored collection")
                                        .build()));

        var armyCollection = armyCollectionsService.getArmyCollection(userId, armyCollectionId);

        assertThat(armyCollection)
                .isEqualTo(
                        new ArmyCollection("Starter Collection")
                                .id(armyCollectionId)
                                .description("Stored collection")
                                .modelCount(0)
                                .modelCountsByStatus(Map.of())
                                .modelDefinitionOrder(List.of()));
    }

    @Test
    void getArmyCollection_throwsNotFound_whenNotOwnedByUser() {
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

        assertThatThrownBy(() -> armyCollectionsService.getArmyCollection(userId, armyCollectionId))
                .isInstanceOf(com.keith.battlereadyshelf.error.NotFoundException.class);
    }

    @Test
    void updateArmyCollection_updatesNameAndDescription_whenOwnedByUser() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .description("Original description")
                                        .build()));
        when(armyCollectionRepository.save(any(ArmyCollectionEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var updated =
                armyCollectionsService.updateArmyCollection(
                        userId, armyCollectionId, "Renamed Collection", "New description");

        assertThat(updated.getName()).isEqualTo("Renamed Collection");
        assertThat(updated.getDescription()).isEqualTo("New description");
    }

    @Test
    void updateArmyCollection_leavesFieldUnchanged_whenNotProvided() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .description("Original description")
                                        .build()));
        when(armyCollectionRepository.save(any(ArmyCollectionEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var updated =
                armyCollectionsService.updateArmyCollection(
                        userId, armyCollectionId, "Renamed Collection", null);

        assertThat(updated.getName()).isEqualTo("Renamed Collection");
        assertThat(updated.getDescription()).isEqualTo("Original description");
    }

    @Test
    void updateArmyCollection_throwsNotFound_whenNotOwnedByUser() {
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
                        () ->
                                armyCollectionsService.updateArmyCollection(
                                        userId, armyCollectionId, "New name", null))
                .isInstanceOf(com.keith.battlereadyshelf.error.NotFoundException.class);
    }

    @Test
    void reorderArmyCollections_persistsNewDisplayOrder() {
        var userId = UUID.randomUUID();
        var firstId = UUID.randomUUID();
        var secondId = UUID.randomUUID();
        var first =
                ArmyCollectionEntity.builder()
                        .id(firstId)
                        .userId(userId)
                        .name("First")
                        .displayOrder(0)
                        .build();
        var second =
                ArmyCollectionEntity.builder()
                        .id(secondId)
                        .userId(userId)
                        .name("Second")
                        .displayOrder(1)
                        .build();
        when(armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId))
                .thenReturn(List.of(first, second));
        when(armyCollectionRepository.saveAll(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var reordered =
                armyCollectionsService.reorderArmyCollections(userId, List.of(secondId, firstId));

        assertThat(reordered).extracting(ArmyCollection::getId).containsExactly(secondId, firstId);
        assertThat(second.getDisplayOrder()).isZero();
        assertThat(first.getDisplayOrder()).isEqualTo(1);
    }

    @Test
    void reorderArmyCollections_throwsBadRequest_whenIdsDontMatchExactly() {
        var userId = UUID.randomUUID();
        var firstId = UUID.randomUUID();
        when(armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId))
                .thenReturn(
                        List.of(
                                ArmyCollectionEntity.builder()
                                        .id(firstId)
                                        .userId(userId)
                                        .name("First")
                                        .build()));

        assertThatThrownBy(
                        () ->
                                armyCollectionsService.reorderArmyCollections(
                                        userId, List.of(UUID.randomUUID())))
                .isInstanceOf(com.keith.battlereadyshelf.error.BadRequestException.class);
    }

    @Test
    void reorderModelDefinitionGroups_replacesExistingOrder_whenOwnedByUser() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var modelDefinitionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
        when(modelDefinitionGroupPositionRepository.findByArmyCollectionIdOrderByDisplayOrderAsc(
                        armyCollectionId))
                .thenReturn(
                        List.of(
                                ModelDefinitionGroupPositionEntity.builder()
                                        .armyCollectionId(armyCollectionId)
                                        .modelDefinitionId(modelDefinitionId)
                                        .displayOrder(0)
                                        .build()));

        var updated =
                armyCollectionsService.reorderModelDefinitionGroups(
                        userId, armyCollectionId, List.of(modelDefinitionId));

        verify(modelDefinitionGroupPositionRepository).deleteByArmyCollectionId(armyCollectionId);
        verify(modelDefinitionGroupPositionRepository).saveAll(any());
        assertThat(updated.getModelDefinitionOrder()).containsExactly(modelDefinitionId);
    }

    @Test
    void reorderModelDefinitionGroups_throwsNotFound_whenNotOwnedByUser() {
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
                        () ->
                                armyCollectionsService.reorderModelDefinitionGroups(
                                        userId, armyCollectionId, List.of(UUID.randomUUID())))
                .isInstanceOf(com.keith.battlereadyshelf.error.NotFoundException.class);
    }
}

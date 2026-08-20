package com.keith.battlereadyshelf.armycollection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.generated.model.ArmyCollection;
import com.keith.battlereadyshelf.user.User;
import com.keith.battlereadyshelf.user.UserRepository;

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
    @Mock private UserRepository userRepository;

    @Captor private ArgumentCaptor<ArmyCollectionEntity> armyCollectionEntityCaptor;

    private ArmyCollectionsService armyCollectionsService;

    @BeforeEach
    void setUp() {
        armyCollectionsService =
                new ArmyCollectionsService(
                        armyCollectionRepository,
                        collectionModelRepository,
                        modelDefinitionGroupPositionRepository,
                        userRepository,
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
        when(userRepository.findById(userId))
                .thenReturn(
                        Optional.of(
                                User.builder()
                                        .id(userId)
                                        .displayName("Test User")
                                        .email("test@example.com")
                                        .build()));

        var armyCollections = armyCollectionsService.getAllArmyCollections(userId);

        assertThat(armyCollections)
                .containsExactly(
                        new ArmyCollection("Starter Collection")
                                .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                                .userId(userId)
                                .userDisplayName("Test User")
                                .description("Stored collection")
                                .isPublic(false)
                                .modelCount(0)
                                .modelCountsByStatus(Map.of())
                                .modelDefinitionOrder(List.of()));
        verify(armyCollectionRepository).findAllByUserIdOrderByDisplayOrderAsc(userId);
    }

    @Test
    void getAllPublicArmyCollections_returnsAllPublicCollectionsWithAttribution() {
        var user1Id = UUID.randomUUID();
        var user2Id = UUID.randomUUID();
        var col1Id = UUID.randomUUID();
        var col2Id = UUID.randomUUID();

        when(armyCollectionRepository.findAllByIsPublicTrueOrderByNameAsc())
                .thenReturn(
                        List.of(
                                ArmyCollectionEntity.builder()
                                        .id(col1Id)
                                        .userId(user1Id)
                                        .name("Chaos Marines")
                                        .description("Death Guard")
                                        .isPublic(true)
                                        .build(),
                                ArmyCollectionEntity.builder()
                                        .id(col2Id)
                                        .userId(user2Id)
                                        .name("Space Marines")
                                        .description("Ultramarines")
                                        .isPublic(true)
                                        .build()));

        when(userRepository.findAllById(List.of(user1Id, user2Id)))
                .thenReturn(
                        List.of(
                                User.builder()
                                        .id(user1Id)
                                        .displayName("Painter Alice")
                                        .email("alice@example.com")
                                        .build(),
                                User.builder()
                                        .id(user2Id)
                                        .displayName("bob")
                                        .email("bob@example.com")
                                        .build()));

        var publicCollections = armyCollectionsService.getAllPublicArmyCollections();

        assertThat(publicCollections)
                .containsExactly(
                        new ArmyCollection("Chaos Marines")
                                .id(col1Id)
                                .userId(user1Id)
                                .userDisplayName("Painter Alice")
                                .description("Death Guard")
                                .isPublic(true)
                                .modelCount(0)
                                .modelCountsByStatus(Map.of())
                                .modelDefinitionOrder(List.of()),
                        new ArmyCollection("Space Marines")
                                .id(col2Id)
                                .userId(user2Id)
                                .userDisplayName("bob")
                                .description("Ultramarines")
                                .isPublic(true)
                                .modelCount(0)
                                .modelCountsByStatus(Map.of())
                                .modelDefinitionOrder(List.of()));
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
        when(userRepository.findById(userId))
                .thenReturn(
                        Optional.of(
                                User.builder()
                                        .id(userId)
                                        .displayName("Test User")
                                        .email("test@example.com")
                                        .build()));

        var createdArmyCollection =
                armyCollectionsService.createArmyCollection(
                        userId,
                        new ArmyCollection("Test Collection").description("Test Description"));

        verify(armyCollectionRepository).save(armyCollectionEntityCaptor.capture());
        assertThat(armyCollectionEntityCaptor.getValue().getUserId()).isEqualTo(userId);
        assertThat(armyCollectionEntityCaptor.getValue().getName()).isEqualTo("Test Collection");
        assertThat(armyCollectionEntityCaptor.getValue().getIsPublic()).isFalse();
        assertThat(createdArmyCollection)
                .isEqualTo(
                        new ArmyCollection("Test Collection")
                                .id(UUID.fromString("22222222-2222-2222-2222-222222222222"))
                                .userId(userId)
                                .userDisplayName("Test User")
                                .description("Test Description")
                                .isPublic(false)
                                .modelCount(0)
                                .modelCountsByStatus(Map.of())
                                .modelDefinitionOrder(List.of()));
    }

    @Test
    void createArmyCollection_persistsPublicCollection_whenIsPublicIsTrue() {
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
                        userId, new ArmyCollection("Public Collection").isPublic(true));

        verify(armyCollectionRepository).save(armyCollectionEntityCaptor.capture());
        assertThat(armyCollectionEntityCaptor.getValue().getIsPublic()).isTrue();
        assertThat(createdArmyCollection.getIsPublic()).isTrue();
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
        when(userRepository.findById(userId))
                .thenReturn(
                        Optional.of(
                                User.builder()
                                        .id(userId)
                                        .displayName("Test User")
                                        .email("test@example.com")
                                        .build()));

        var armyCollection = armyCollectionsService.getArmyCollection(userId, armyCollectionId);

        assertThat(armyCollection)
                .isEqualTo(
                        new ArmyCollection("Starter Collection")
                                .id(armyCollectionId)
                                .userId(userId)
                                .userDisplayName("Test User")
                                .description("Stored collection")
                                .isPublic(false)
                                .modelCount(0)
                                .modelCountsByStatus(Map.of())
                                .modelDefinitionOrder(List.of()));
    }

    @Test
    void getArmyCollection_returnsCollection_whenPublicAndRequestedByDifferentUser() {
        var ownerId = UUID.randomUUID();
        var otherUserId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(ownerId)
                                        .name("Public Collection")
                                        .description("Public description")
                                        .isPublic(true)
                                        .build()));
        when(userRepository.findById(ownerId))
                .thenReturn(
                        Optional.of(
                                User.builder()
                                        .id(ownerId)
                                        .displayName("Owner User")
                                        .email("owner@example.com")
                                        .build()));

        var armyCollection =
                armyCollectionsService.getArmyCollection(otherUserId, armyCollectionId);

        assertThat(armyCollection)
                .isEqualTo(
                        new ArmyCollection("Public Collection")
                                .id(armyCollectionId)
                                .userId(ownerId)
                                .userDisplayName("Owner User")
                                .description("Public description")
                                .isPublic(true)
                                .modelCount(0)
                                .modelCountsByStatus(Map.of())
                                .modelDefinitionOrder(List.of()));
    }

    @Test
    void getArmyCollection_returnsCollection_whenPublicAndRequestedByAnonymousUser() {
        var ownerId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(ownerId)
                                        .name("Public Collection")
                                        .description("Public description")
                                        .isPublic(true)
                                        .build()));
        when(userRepository.findById(ownerId))
                .thenReturn(
                        Optional.of(
                                User.builder()
                                        .id(ownerId)
                                        .displayName("Owner User")
                                        .email("owner@example.com")
                                        .build()));

        var armyCollection = armyCollectionsService.getArmyCollection(null, armyCollectionId);

        assertThat(armyCollection.getName()).isEqualTo("Public Collection");
        assertThat(armyCollection.getUserDisplayName()).isEqualTo("Owner User");
    }

    @Test
    void getArmyCollection_throwsNotFound_whenPrivateAndRequestedByDifferentUser() {
        var ownerId = UUID.randomUUID();
        var otherUserId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(ownerId)
                                        .name("Private Collection")
                                        .isPublic(false)
                                        .build()));

        assertThatThrownBy(
                        () ->
                                armyCollectionsService.getArmyCollection(
                                        otherUserId, armyCollectionId))
                .isInstanceOf(com.keith.battlereadyshelf.error.NotFoundException.class);
    }

    @Test
    void getArmyCollection_throwsNotFound_whenPrivateAndRequestedByAnonymousUser() {
        var ownerId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(ownerId)
                                        .name("Private Collection")
                                        .isPublic(false)
                                        .build()));

        assertThatThrownBy(() -> armyCollectionsService.getArmyCollection(null, armyCollectionId))
                .isInstanceOf(com.keith.battlereadyshelf.error.NotFoundException.class);
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
                        userId, armyCollectionId, "Renamed Collection", "New description", null);

        assertThat(updated.getName()).isEqualTo("Renamed Collection");
        assertThat(updated.getDescription()).isEqualTo("New description");
        assertThat(updated.getIsPublic()).isFalse();
    }

    @Test
    void updateArmyCollection_updatesIsPublic_whenOwnedByUser() {
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
                                        .isPublic(false)
                                        .build()));
        when(armyCollectionRepository.save(any(ArmyCollectionEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var updated =
                armyCollectionsService.updateArmyCollection(
                        userId, armyCollectionId, null, null, true);

        assertThat(updated.getName()).isEqualTo("Starter Collection");
        assertThat(updated.getDescription()).isEqualTo("Original description");
        assertThat(updated.getIsPublic()).isTrue();
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
                        userId, armyCollectionId, "Renamed Collection", null, null);

        assertThat(updated.getName()).isEqualTo("Renamed Collection");
        assertThat(updated.getDescription()).isEqualTo("Original description");
        assertThat(updated.getIsPublic()).isFalse();
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
                                        userId, armyCollectionId, "New name", null, null))
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

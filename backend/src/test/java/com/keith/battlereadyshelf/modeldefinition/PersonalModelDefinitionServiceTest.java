package com.keith.battlereadyshelf.modeldefinition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.ConflictException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.UpsertAttachmentSlotDraftRequest;
import com.keith.battlereadyshelf.generated.model.UpsertModelDefinitionDraftRequest;
import com.keith.battlereadyshelf.generated.model.UpsertWargearOptionDraftRequest;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;
import com.keith.battlereadyshelf.user.Role;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class PersonalModelDefinitionServiceTest {
    private static final UUID USER_ID = UUID.randomUUID();
    private static final CurrentAuthenticatedUser CURRENT_USER =
            new CurrentAuthenticatedUser(
                    USER_ID, "user@example.com", Role.USER, Instant.now(), Instant.now());

    @Mock private ModelDefinitionRepository modelDefinitionRepository;
    @Mock private AttachmentSlotRepository attachmentSlotRepository;
    @Mock private WargearOptionRepository wargearOptionRepository;
    @Mock private WargearDefinitionRepository wargearDefinitionRepository;
    @Mock private CollectionModelRepository collectionModelRepository;

    private PersonalModelDefinitionService service;

    @BeforeEach
    void setUp() {
        service =
                new PersonalModelDefinitionService(
                        modelDefinitionRepository,
                        attachmentSlotRepository,
                        wargearOptionRepository,
                        wargearDefinitionRepository,
                        collectionModelRepository,
                        new ModelDefinitionMapperImpl());

        // Mirror what a real persist does - assign an id and touch nothing else. Filling in fields
        // the production code is responsible for would mask exactly the bugs these tests exist to
        // catch.
        lenient()
                .when(modelDefinitionRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            ModelDefinitionEntity entity = invocation.getArgument(0);
                            if (entity.getId() == null) {
                                entity.setId(UUID.randomUUID());
                            }
                            return entity;
                        });
        lenient()
                .when(attachmentSlotRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            AttachmentSlotEntity entity = invocation.getArgument(0);
                            if (entity.getId() == null) {
                                entity.setId(UUID.randomUUID());
                            }
                            return entity;
                        });
        lenient()
                .when(wargearOptionRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            WargearOptionEntity entity = invocation.getArgument(0);
                            if (entity.getId() == null) {
                                entity.setId(UUID.randomUUID());
                            }
                            return entity;
                        });
        lenient()
                .when(wargearDefinitionRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            WargearDefinitionEntity entity = invocation.getArgument(0);
                            if (entity.getId() == null) {
                                entity.setId(UUID.randomUUID());
                            }
                            return entity;
                        });
        lenient()
                .when(attachmentSlotRepository.findAllByModelDefinitionIdIn(any()))
                .thenReturn(List.of());
        lenient()
                .when(wargearOptionRepository.findAllByModelDefinitionIdIn(any()))
                .thenReturn(List.of());
    }

    @Test
    void customising_copiesTheSharedDefinitionAndRecordsWhereEachRowCameFrom() {
        var sharedId = UUID.randomUUID();
        var sharedSlotId = UUID.randomUUID();
        var sharedOptionId = UUID.randomUUID();
        var factionId = UUID.randomUUID();
        var boltgun = WargearDefinitionEntity.builder().id(UUID.randomUUID()).name("Boltgun").build();

        var sharedSlot =
                AttachmentSlotEntity.builder()
                        .id(sharedSlotId)
                        .modelDefinitionId(sharedId)
                        .externalId("left_arm")
                        .name("Left Arm")
                        .type("arm")
                        .build();

        when(modelDefinitionRepository.findByOwnerUserIdAndBaseModelDefinitionId(USER_ID, sharedId))
                .thenReturn(Optional.empty());
        when(modelDefinitionRepository.findById(sharedId))
                .thenReturn(
                        Optional.of(
                                ModelDefinitionEntity.builder()
                                        .id(sharedId)
                                        .externalId("plague_marine")
                                        .factionId(factionId)
                                        .name("Plague Marine")
                                        .description("A stalwart of the Death Guard.")
                                        .version(4)
                                        .build()));
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(sharedId)))
                .thenReturn(List.of(sharedSlot));
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(sharedId)))
                .thenReturn(
                        List.of(
                                WargearOptionEntity.builder()
                                        .id(sharedOptionId)
                                        .modelDefinitionId(sharedId)
                                        .wargearDefinition(boltgun)
                                        .isDefault(true)
                                        .attachmentSlots(List.of(sharedSlot))
                                        .build()));

        service.customiseModelDefinition(CURRENT_USER, sharedId);

        var savedDefinition = ArgumentCaptor.forClass(ModelDefinitionEntity.class);
        verify(modelDefinitionRepository).save(savedDefinition.capture());
        assertThat(savedDefinition.getValue().getOwnerUserId()).isEqualTo(USER_ID);
        assertThat(savedDefinition.getValue().getBaseModelDefinitionId()).isEqualTo(sharedId);
        assertThat(savedDefinition.getValue().getName()).isEqualTo("Plague Marine");
        assertThat(savedDefinition.getValue().getFactionId()).isEqualTo(factionId);
        // The dataset's id belongs to the shared row and is globally unique, so the fork must not
        // claim it - lineage is carried by baseModelDefinitionId instead.
        assertThat(savedDefinition.getValue().getExternalId()).isNull();

        var savedSlot = ArgumentCaptor.forClass(AttachmentSlotEntity.class);
        verify(attachmentSlotRepository).save(savedSlot.capture());
        assertThat(savedSlot.getValue().getBaseAttachmentSlotId()).isEqualTo(sharedSlotId);
        assertThat(savedSlot.getValue().getName()).isEqualTo("Left Arm");

        var savedOption = ArgumentCaptor.forClass(WargearOptionEntity.class);
        verify(wargearOptionRepository).save(savedOption.capture());
        assertThat(savedOption.getValue().getBaseWargearOptionId()).isEqualTo(sharedOptionId);
        assertThat(savedOption.getValue().getWargearDefinition()).isEqualTo(boltgun);
        assertThat(savedOption.getValue().getAttachmentSlots())
                .containsExactly(savedSlot.getValue());
    }

    @Test
    void customisingTwiceReturnsTheExistingCopyRatherThanForkingAgain() {
        var sharedId = UUID.randomUUID();
        var existingId = UUID.randomUUID();
        when(modelDefinitionRepository.findByOwnerUserIdAndBaseModelDefinitionId(USER_ID, sharedId))
                .thenReturn(
                        Optional.of(
                                ModelDefinitionEntity.builder()
                                        .id(existingId)
                                        .ownerUserId(USER_ID)
                                        .baseModelDefinitionId(sharedId)
                                        .name("Plague Marine")
                                        .build()));

        var result = service.customiseModelDefinition(CURRENT_USER, sharedId);

        assertThat(result.getId()).isEqualTo(existingId);
        verify(modelDefinitionRepository, never()).save(any());
    }

    @Test
    void customisingSomethingThatAlreadyBelongsToAUserIsRejected() {
        var otherPersonalId = UUID.randomUUID();
        when(modelDefinitionRepository.findByOwnerUserIdAndBaseModelDefinitionId(USER_ID, otherPersonalId))
                .thenReturn(Optional.empty());
        when(modelDefinitionRepository.findById(otherPersonalId))
                .thenReturn(
                        Optional.of(
                                ModelDefinitionEntity.builder()
                                        .id(otherPersonalId)
                                        .ownerUserId(UUID.randomUUID())
                                        .name("Someone else's model")
                                        .build()));

        assertThatThrownBy(() -> service.customiseModelDefinition(CURRENT_USER, otherPersonalId))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void anotherUsersDefinitionCannotBeEdited() {
        var otherPersonalId = UUID.randomUUID();
        when(modelDefinitionRepository.findByIdAndOwnerUserId(otherPersonalId, USER_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                service.updateMyModelDefinition(
                                        CURRENT_USER, otherPersonalId, request("Renamed")))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void editingKeepsTheRowsTheRequestStillReferencesAndDeletesTheRest() {
        var personalId = UUID.randomUUID();
        var keptSlotId = UUID.randomUUID();
        var droppedSlotId = UUID.randomUUID();
        var boltgun = WargearDefinitionEntity.builder().id(UUID.randomUUID()).name("Boltgun").build();

        var keptSlot =
                AttachmentSlotEntity.builder()
                        .id(keptSlotId)
                        .modelDefinitionId(personalId)
                        .baseAttachmentSlotId(UUID.randomUUID())
                        .name("Left Arm")
                        .type("arm")
                        .build();
        var droppedSlot =
                AttachmentSlotEntity.builder()
                        .id(droppedSlotId)
                        .modelDefinitionId(personalId)
                        .name("Right Arm")
                        .type("arm")
                        .build();

        when(modelDefinitionRepository.findByIdAndOwnerUserId(personalId, USER_ID))
                .thenReturn(
                        Optional.of(
                                ModelDefinitionEntity.builder()
                                        .id(personalId)
                                        .ownerUserId(USER_ID)
                                        .name("Plague Marine")
                                        .build()));
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(personalId)))
                .thenReturn(List.of(keptSlot, droppedSlot));
        when(wargearDefinitionRepository.findById(boltgun.getId())).thenReturn(Optional.of(boltgun));

        var request =
                new UpsertModelDefinitionDraftRequest(
                        "Plague Marine (converted)",
                        List.of(new UpsertAttachmentSlotDraftRequest(keptSlotId, "Power Fist", "arm")),
                        List.of(
                                        new UpsertWargearOptionDraftRequest(
                                                        UUID.randomUUID(), "Boltgun", true, List.of(keptSlotId))
                                                .wargearDefinitionId(boltgun.getId())));

        service.updateMyModelDefinition(CURRENT_USER, personalId, request);

        verify(attachmentSlotRepository).deleteAll(List.of(droppedSlot));
        // Renaming a kept slot must not discard its link back to the shared row, or the next diff
        // would report the slot as newly added instead of edited.
        assertThat(keptSlot.getName()).isEqualTo("Power Fist");
        assertThat(keptSlot.getBaseAttachmentSlotId()).isNotNull();
    }

    @Test
    void namingWargearTheSharedCatalogueAlreadyHasReusesItInsteadOfCreatingAPersonalCopy() {
        var personalId = UUID.randomUUID();
        var shared = WargearDefinitionEntity.builder().id(UUID.randomUUID()).name("Boltgun").build();

        when(modelDefinitionRepository.findByIdAndOwnerUserId(personalId, USER_ID))
                .thenReturn(
                        Optional.of(
                                ModelDefinitionEntity.builder()
                                        .id(personalId)
                                        .ownerUserId(USER_ID)
                                        .name("My Kitbash")
                                        .build()));
        when(wargearDefinitionRepository.findFirstByOwnerUserIdAndNameIgnoreCase(USER_ID, "Boltgun"))
                .thenReturn(Optional.empty());
        when(wargearDefinitionRepository.findFirstByOwnerUserIdIsNullAndNameIgnoreCase("Boltgun"))
                .thenReturn(Optional.of(shared));

        service.updateMyModelDefinition(
                CURRENT_USER,
                personalId,
                new UpsertModelDefinitionDraftRequest(
                        "My Kitbash",
                        List.of(),
                        List.of(
                                        new UpsertWargearOptionDraftRequest(
                                                UUID.randomUUID(), "Boltgun", false, List.of()))));

        verify(wargearDefinitionRepository, never()).save(any());
        var savedOption = ArgumentCaptor.forClass(WargearOptionEntity.class);
        verify(wargearOptionRepository).save(savedOption.capture());
        assertThat(savedOption.getValue().getWargearDefinition()).isEqualTo(shared);
    }

    @Test
    void namingWargearNobodyHasCreatesItPrivatelyRatherThanInTheSharedCatalogue() {
        var personalId = UUID.randomUUID();

        when(modelDefinitionRepository.findByIdAndOwnerUserId(personalId, USER_ID))
                .thenReturn(
                        Optional.of(
                                ModelDefinitionEntity.builder()
                                        .id(personalId)
                                        .ownerUserId(USER_ID)
                                        .name("My Kitbash")
                                        .build()));
        when(wargearDefinitionRepository.findFirstByOwnerUserIdAndNameIgnoreCase(USER_ID, "Chainsaw Bat"))
                .thenReturn(Optional.empty());
        when(wargearDefinitionRepository.findFirstByOwnerUserIdIsNullAndNameIgnoreCase("Chainsaw Bat"))
                .thenReturn(Optional.empty());

        service.updateMyModelDefinition(
                CURRENT_USER,
                personalId,
                new UpsertModelDefinitionDraftRequest(
                        "My Kitbash",
                        List.of(),
                        List.of(
                                        new UpsertWargearOptionDraftRequest(
                                                UUID.randomUUID(), "Chainsaw Bat", false, List.of()))));

        var savedWargear = ArgumentCaptor.forClass(WargearDefinitionEntity.class);
        verify(wargearDefinitionRepository).save(savedWargear.capture());
        assertThat(savedWargear.getValue().getOwnerUserId()).isEqualTo(USER_ID);
        assertThat(savedWargear.getValue().getExternalId()).isNull();
    }

    @Test
    void anotherUsersPrivateWargearCannotBeAttached() {
        var personalId = UUID.randomUUID();
        var theirWargearId = UUID.randomUUID();

        when(modelDefinitionRepository.findByIdAndOwnerUserId(personalId, USER_ID))
                .thenReturn(
                        Optional.of(
                                ModelDefinitionEntity.builder()
                                        .id(personalId)
                                        .ownerUserId(USER_ID)
                                        .name("My Kitbash")
                                        .build()));
        when(wargearDefinitionRepository.findById(theirWargearId))
                .thenReturn(
                        Optional.of(
                                WargearDefinitionEntity.builder()
                                        .id(theirWargearId)
                                        .ownerUserId(UUID.randomUUID())
                                        .name("Their Conversion")
                                        .build()));

        var request =
                new UpsertModelDefinitionDraftRequest(
                        "My Kitbash",
                        List.of(),
                        List.of(
                                        new UpsertWargearOptionDraftRequest(
                                                        UUID.randomUUID(), "Their Conversion", false, List.of())
                                                .wargearDefinitionId(theirWargearId)));

        assertThatThrownBy(() -> service.updateMyModelDefinition(CURRENT_USER, personalId, request))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void deletingRevertsToTheSharedDefinition() {
        var personalId = UUID.randomUUID();
        when(modelDefinitionRepository.findByIdAndOwnerUserId(personalId, USER_ID))
                .thenReturn(
                        Optional.of(
                                ModelDefinitionEntity.builder()
                                        .id(personalId)
                                        .ownerUserId(USER_ID)
                                        .baseModelDefinitionId(UUID.randomUUID())
                                        .name("Plague Marine")
                                        .build()));
        when(collectionModelRepository.countByModelDefinitionId(personalId)).thenReturn(0L);

        service.deleteMyModelDefinition(CURRENT_USER, personalId);

        verify(modelDefinitionRepository).deleteById(personalId);
    }

    @Test
    void deletingIsRefusedWhileTheUsersCollectionStillReferencesIt() {
        var personalId = UUID.randomUUID();
        when(modelDefinitionRepository.findByIdAndOwnerUserId(personalId, USER_ID))
                .thenReturn(
                        Optional.of(
                                ModelDefinitionEntity.builder()
                                        .id(personalId)
                                        .ownerUserId(USER_ID)
                                        .name("Plague Marine")
                                        .build()));
        when(collectionModelRepository.countByModelDefinitionId(personalId)).thenReturn(2L);

        assertThatThrownBy(() -> service.deleteMyModelDefinition(CURRENT_USER, personalId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("2");
        verify(modelDefinitionRepository, never()).deleteById(personalId);
    }

    @Test
    void creatingFromScratchOwnsTheDefinitionAndLeavesItWithNoBase() {
        service.createMyModelDefinition(CURRENT_USER, request("My Kitbash"));

        var saved = ArgumentCaptor.forClass(ModelDefinitionEntity.class);
        verify(modelDefinitionRepository).save(saved.capture());
        assertThat(saved.getValue().getOwnerUserId()).isEqualTo(USER_ID);
        assertThat(saved.getValue().getBaseModelDefinitionId()).isNull();
        assertThat(saved.getValue().getExternalId()).isNull();
    }

    @Test
    void theAvailableWargearIsTheSharedCataloguePlusThisUsersOwn() {
        when(wargearDefinitionRepository.findAllByOwnerUserIdIsNull())
                .thenReturn(
                        List.of(WargearDefinitionEntity.builder().id(UUID.randomUUID()).name("Boltgun").build()));
        when(wargearDefinitionRepository.findAllByOwnerUserId(USER_ID))
                .thenReturn(
                        List.of(
                                WargearDefinitionEntity.builder()
                                        .id(UUID.randomUUID())
                                        .ownerUserId(USER_ID)
                                        .name("Chainsaw Bat")
                                        .build()));

        var available = service.getAvailableWargearDefinitions(CURRENT_USER);

        assertThat(available).extracting("name").containsExactly("Boltgun", "Chainsaw Bat");
        assertThat(available).extracting("ownerUserId").containsExactly(null, USER_ID);
    }

    @Test
    void theSharedCatalogueIsReturnedUnshadowedSoACustomisationCanStillBeDiffedAgainstIt() {
        var customisedId = UUID.randomUUID();
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull())
                .thenReturn(
                        List.of(
                                ModelDefinitionEntity.builder().id(customisedId).name("Poxwalker").build(),
                                ModelDefinitionEntity.builder().id(UUID.randomUUID()).name("Cultist").build()));

        var shared = service.getSharedModelDefinitions();

        // The user has customised "Poxwalker", but it must still appear here: this is the page's
        // only source for the original, both to diff against and to show what reverting restores.
        assertThat(shared).extracting("name").containsExactly("Cultist", "Poxwalker");
        assertThat(shared).extracting("ownerUserId").containsOnlyNulls();
        verify(modelDefinitionRepository, never()).findAllByOwnerUserId(any());
    }

    @Test
    void listingTheSharedCatalogueFetchesChildrenInOneQueryEachRatherThanPerDefinition() {
        var definitions = new java.util.ArrayList<ModelDefinitionEntity>();
        for (var i = 0; i < 50; i++) {
            definitions.add(
                    ModelDefinitionEntity.builder().id(UUID.randomUUID()).name("Definition " + i).build());
        }
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(definitions);

        var shared = service.getSharedModelDefinitions();

        assertThat(shared).hasSize(50);
        // The catalogue runs to a couple of hundred definitions. Fetching each one's slots and
        // options separately is unnoticeable against a local database but costs seconds against a
        // hosted one, so the child fetches have to stay batched no matter how long the list gets.
        verify(attachmentSlotRepository, times(1)).findAllByModelDefinitionIdIn(any());
        verify(wargearOptionRepository, times(1)).findAllByModelDefinitionIdIn(any());
    }

    private UpsertModelDefinitionDraftRequest request(String name) {
        return new UpsertModelDefinitionDraftRequest(name, List.of(), List.of());
    }
}

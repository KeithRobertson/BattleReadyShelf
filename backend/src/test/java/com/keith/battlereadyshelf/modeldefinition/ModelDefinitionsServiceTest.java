package com.keith.battlereadyshelf.modeldefinition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.error.ConflictException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.AttachmentSlot;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.WargearOption;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;
import com.keith.battlereadyshelf.user.Role;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class ModelDefinitionsServiceTest {
    @Mock private ModelDefinitionRepository modelDefinitionRepository;
    @Mock private AttachmentSlotRepository attachmentSlotRepository;
    @Mock private WargearOptionRepository wargearOptionRepository;
    @Mock private CollectionModelRepository collectionModelRepository;
    @Mock private AuthenticatedUserProvider authenticatedUserProvider;

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
                        authenticatedUserProvider);
    }

    private void signedInAs(UUID userId) {
        when(authenticatedUserProvider.findCurrentUser())
                .thenReturn(
                        Optional.of(
                                new CurrentAuthenticatedUser(
                                        userId,
                                        "user@example.com",
                                        Role.USER,
                                        Instant.now(),
                                        Instant.now())));
    }

    @Test
    void getAllModelDefinitions_returnsAllModelDefinitions() {
        var poxwalkerId = UUID.randomUUID();
        when(authenticatedUserProvider.findCurrentUser()).thenReturn(Optional.empty());
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull())
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

        when(authenticatedUserProvider.findCurrentUser()).thenReturn(Optional.empty());
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull())
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
                        .type("arm")
                        .build();
        var rightArm =
                AttachmentSlotEntity.builder()
                        .id(rightArmId)
                        .modelDefinitionId(plagueMarineId)
                        .name("Right Arm")
                        .type("arm")
                        .build();
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(plagueMarineId)))
                .thenReturn(List.of(leftArm, rightArm));

        var boltgunDefinition =
                WargearDefinitionEntity.builder().id(UUID.randomUUID()).name("Boltgun").build();
        var boltgun =
                WargearOptionEntity.builder()
                        .id(boltgunId)
                        .modelDefinitionId(plagueMarineId)
                        .wargearDefinition(boltgunDefinition)
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
                                                new AttachmentSlot("Left Arm", "arm").id(leftArmId),
                                                new AttachmentSlot("Right Arm", "arm").id(rightArmId)))
                                .wargearOptions(
                                        List.of(
                                                new WargearOption("Boltgun", true, List.of(leftArmId))
                                                        .id(boltgunId)
                                                        .wargearDefinitionId(boltgunDefinition.getId()))));
    }

    @Test
    void getAllModelDefinitions_listsACustomisationAlongsideTheSharedDefinitionItCameFrom() {
        var userId = UUID.randomUUID();
        var sharedId = UUID.randomUUID();
        var personalId = UUID.randomUUID();
        var untouchedId = UUID.randomUUID();
        signedInAs(userId);

        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull())
                .thenReturn(
                        List.of(
                                ModelDefinitionEntity.builder().id(sharedId).name("Plague Marine").build(),
                                ModelDefinitionEntity.builder().id(untouchedId).name("Poxwalker").build()));
        when(modelDefinitionRepository.findAllByOwnerUserId(userId))
                .thenReturn(
                        List.of(
                                ModelDefinitionEntity.builder()
                                        .id(personalId)
                                        .ownerUserId(userId)
                                        .baseModelDefinitionId(sharedId)
                                        // Customisations usually keep the original's name, which is
                                        // why the DTO has to carry the owner and base for callers to
                                        // tell the two entries apart.
                                        .name("Plague Marine")
                                        .build()));
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(
                        List.of(sharedId, untouchedId, personalId)))
                .thenReturn(List.of());
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(
                        List.of(sharedId, untouchedId, personalId)))
                .thenReturn(List.of());

        var modelDefinitions = modelDefinitionsService.getAllModelDefinitions();

        // The stock Plague Marine stays available: having customised one is not a reason to stop
        // being able to add the unmodified version to a collection.
        assertThat(modelDefinitions)
                .extracting(
                        ModelDefinition::getId,
                        ModelDefinition::getName,
                        ModelDefinition::getOwnerUserId,
                        ModelDefinition::getBaseModelDefinitionId)
                .containsExactly(
                        tuple(sharedId, "Plague Marine", null, null),
                        tuple(untouchedId, "Poxwalker", null, null),
                        tuple(personalId, "Plague Marine", userId, sharedId));
    }

    @Test
    void getAllModelDefinitions_hidesEveryPersonalDefinitionFromAnonymousCallers() {
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull())
                .thenReturn(
                        List.of(ModelDefinitionEntity.builder().id(UUID.randomUUID()).name("Plague Marine").build()));

        var modelDefinitions = modelDefinitionsService.getAllModelDefinitions();

        assertThat(modelDefinitions).extracting(ModelDefinition::getName).containsExactly("Plague Marine");
        verify(modelDefinitionRepository, never()).findAllByOwnerUserId(any());
    }

    @Test
    void getAllModelDefinitions_keepsSharedDefinitionsTheUserHasNotCustomised() {
        var userId = UUID.randomUUID();
        var sharedId = UUID.randomUUID();
        var standaloneId = UUID.randomUUID();
        signedInAs(userId);

        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull())
                .thenReturn(
                        List.of(ModelDefinitionEntity.builder().id(sharedId).name("Plague Marine").build()));
        // A definition the user wrote from scratch simply joins the list.
        when(modelDefinitionRepository.findAllByOwnerUserId(userId))
                .thenReturn(
                        List.of(
                                ModelDefinitionEntity.builder()
                                        .id(standaloneId)
                                        .ownerUserId(userId)
                                        .name("My Kitbash")
                                        .build()));
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(sharedId, standaloneId)))
                .thenReturn(List.of());
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(sharedId, standaloneId)))
                .thenReturn(List.of());

        var modelDefinitions = modelDefinitionsService.getAllModelDefinitions();

        assertThat(modelDefinitions)
                .extracting(ModelDefinition::getId)
                .containsExactly(sharedId, standaloneId);
    }

    @Test
    void getSharedModelDefinitions_neverIncludesTheCallersOwnDefinitions() {
        var sharedId = UUID.randomUUID();

        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull())
                .thenReturn(
                        List.of(ModelDefinitionEntity.builder().id(sharedId).name("Plague Marine").build()));
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(sharedId)))
                .thenReturn(List.of());
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(sharedId)))
                .thenReturn(List.of());

        var modelDefinitions = modelDefinitionsService.getSharedModelDefinitions();

        // Admins curate the shared catalogue only, so who is signed in must make no difference:
        // unlike the public catalogue endpoint this never folds in the caller's own definitions.
        assertThat(modelDefinitions).extracting(ModelDefinition::getId).containsExactly(sharedId);
        verify(authenticatedUserProvider, never()).findCurrentUser();
        verify(modelDefinitionRepository, never()).findAllByOwnerUserId(any());
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


package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.ConflictException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.UpsertAttachmentSlotDraftRequest;
import com.keith.battlereadyshelf.generated.model.UpsertModelDefinitionDraftRequest;
import com.keith.battlereadyshelf.generated.model.UpsertWargearOptionDraftRequest;
import com.keith.battlereadyshelf.generated.model.WargearDefinition;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Lets a user author model definitions of their own and customise the shared ones, without the
 * draft/publish workflow the admin pages use. There is nothing to publish here: a personal
 * definition is live for its owner the moment it is saved, and the "diff" the UI shows compares it
 * against the shared definition it was forked from rather than against a pending change.
 *
 * <p>Personal definitions are ordinary rows in {@code model_definitions} carrying an owner, so
 * collection models and wargear selections reference them through the same foreign keys as any
 * other definition. A customisation additionally records the shared row it came from, and each of
 * its slots and options records the shared child it came from, which is what lets a rename be
 * reported as an edit instead of an unrelated add plus remove.
 */
@Service
@RequiredArgsConstructor
public class PersonalModelDefinitionService {
    private final ModelDefinitionRepository modelDefinitionRepository;
    private final AttachmentSlotRepository attachmentSlotRepository;
    private final WargearOptionRepository wargearOptionRepository;
    private final WargearDefinitionRepository wargearDefinitionRepository;
    private final CollectionModelRepository collectionModelRepository;
    private final ModelDefinitionMapper modelDefinitionMapper;

    public List<ModelDefinition> getMyModelDefinitions(CurrentAuthenticatedUser currentUser) {
        return modelDefinitionRepository.findAllByOwnerUserId(currentUser.id()).stream()
                .sorted(Comparator.comparing(ModelDefinitionEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toDtoWithChildren)
                .toList();
    }

    /**
     * The shared definitions themselves, with no personal customisation substituted in. This is
     * deliberately different from the public catalogue, which hides a shared definition once the
     * user has customised it: the personal definitions page needs the original both to offer it for
     * customisation and to diff a personal copy against.
     */
    public List<ModelDefinition> getSharedModelDefinitions() {
        return modelDefinitionRepository.findAllByOwnerUserIdIsNull().stream()
                .sorted(Comparator.comparing(ModelDefinitionEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toDtoWithChildren)
                .toList();
    }

    /**
     * The wargear this user can attach: the shared catalogue plus anything they have named
     * themselves. Sorted together because the picker presents them as one list - which one a name
     * resolves to is an implementation detail the user shouldn't have to think about.
     */
    public List<WargearDefinition> getAvailableWargearDefinitions(CurrentAuthenticatedUser currentUser) {
        return Stream.concat(
                        wargearDefinitionRepository.findAllByOwnerUserIdIsNull().stream(),
                        wargearDefinitionRepository.findAllByOwnerUserId(currentUser.id()).stream())
                .sorted(Comparator.comparing(WargearDefinitionEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .map(
                        definition ->
                                new WargearDefinition(definition.getName())
                                        .id(definition.getId())
                                        .externalId(definition.getExternalId())
                                        .ownerUserId(definition.getOwnerUserId()))
                .toList();
    }

    @Transactional
    public ModelDefinition createMyModelDefinition(
            CurrentAuthenticatedUser currentUser, UpsertModelDefinitionDraftRequest request) {
        var created =
                modelDefinitionRepository.save(
                        ModelDefinitionEntity.builder()
                                .ownerUserId(currentUser.id())
                                .factionId(request.getFactionId())
                                .name(request.getName())
                                .description(request.getDescription())
                                .version(1)
                                .build());
        applyChildren(currentUser, created.getId(), request);
        return toDtoWithChildren(created);
    }

    /**
     * Forks a shared definition into one owned by this user. Idempotent: a user who already has a
     * customisation of this definition gets it back rather than a second copy, which is what the
     * unique index on (owner, base) enforces at the database level too.
     *
     * <p>The copy deliberately drops {@code externalId}. That id belongs to the shared row the
     * reference dataset owns and is globally unique; the fork's lineage is recorded by
     * {@code baseModelDefinitionId} instead, which is also what a later import matches on to leave
     * personal rows alone.
     */
    @Transactional
    public ModelDefinition customiseModelDefinition(
            CurrentAuthenticatedUser currentUser, UUID modelDefinitionId) {
        var existing =
                modelDefinitionRepository.findByOwnerUserIdAndBaseModelDefinitionId(
                        currentUser.id(), modelDefinitionId);
        if (existing.isPresent()) {
            return toDtoWithChildren(existing.get());
        }

        var shared =
                modelDefinitionRepository
                        .findById(modelDefinitionId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Model definition not found: " + modelDefinitionId));
        if (shared.getOwnerUserId() != null) {
            throw new BadRequestException(
                    "Only a shared model definition can be customised; "
                            + modelDefinitionId
                            + " already belongs to a user.");
        }

        var personal =
                modelDefinitionRepository.save(
                        ModelDefinitionEntity.builder()
                                .ownerUserId(currentUser.id())
                                .baseModelDefinitionId(shared.getId())
                                .factionId(shared.getFactionId())
                                .name(shared.getName())
                                .description(shared.getDescription())
                                .version(1)
                                .build());

        copyChildren(shared.getId(), personal.getId());
        return toDtoWithChildren(personal);
    }

    @Transactional
    public ModelDefinition updateMyModelDefinition(
            CurrentAuthenticatedUser currentUser,
            UUID modelDefinitionId,
            UpsertModelDefinitionDraftRequest request) {
        var personal = requireOwned(currentUser, modelDefinitionId);
        personal.setName(request.getName());
        personal.setFactionId(request.getFactionId());
        personal.setDescription(request.getDescription());
        modelDefinitionRepository.save(personal);

        applyChildren(currentUser, modelDefinitionId, request);
        return toDtoWithChildren(personal);
    }

    /**
     * Deletes a personal definition. For a customisation this is the "revert to the shared
     * version" action, since the shared definition becomes visible again as soon as nothing
     * shadows it.
     *
     * <p>Refuses while the user's collection still points at it: those rows are protected by an
     * {@code ON DELETE RESTRICT} foreign key, and their recorded wargear selections reference this
     * definition's own slots, so silently repointing them at the shared definition would discard
     * what the user recorded about models they have already built.
     */
    @Transactional
    public void deleteMyModelDefinition(CurrentAuthenticatedUser currentUser, UUID modelDefinitionId) {
        requireOwned(currentUser, modelDefinitionId);

        var inUseCount = collectionModelRepository.countByModelDefinitionId(modelDefinitionId);
        if (inUseCount > 0) {
            throw new ConflictException(
                    "Cannot delete: "
                            + inUseCount
                            + " model(s) in your collection still use this definition. Reassign them"
                            + " first.");
        }
        modelDefinitionRepository.deleteById(modelDefinitionId);
    }

    private ModelDefinitionEntity requireOwned(
            CurrentAuthenticatedUser currentUser, UUID modelDefinitionId) {
        return modelDefinitionRepository
                .findByIdAndOwnerUserId(modelDefinitionId, currentUser.id())
                .orElseThrow(
                        () ->
                                new NotFoundException(
                                        "Model definition not found: " + modelDefinitionId));
    }

    /** Seeds a fresh fork's slots and options from the shared definition, recording lineage on each. */
    private void copyChildren(UUID sharedId, UUID personalId) {
        Map<UUID, AttachmentSlotEntity> personalSlotBySharedSlotId = new HashMap<>();
        for (var sharedSlot : attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(sharedId))) {
            var copy =
                    attachmentSlotRepository.save(
                            AttachmentSlotEntity.builder()
                                    .modelDefinitionId(personalId)
                                    .baseAttachmentSlotId(sharedSlot.getId())
                                    .externalId(sharedSlot.getExternalId())
                                    .name(sharedSlot.getName())
                                    .type(sharedSlot.getType())
                                    .build());
            personalSlotBySharedSlotId.put(sharedSlot.getId(), copy);
        }

        for (var sharedOption : wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(sharedId))) {
            wargearOptionRepository.save(
                    WargearOptionEntity.builder()
                            .modelDefinitionId(personalId)
                            .baseWargearOptionId(sharedOption.getId())
                            .wargearDefinition(sharedOption.getWargearDefinition())
                            .isDefault(sharedOption.isDefault())
                            .attachmentSlots(
                                    sharedOption.getAttachmentSlots().stream()
                                            .map(slot -> personalSlotBySharedSlotId.get(slot.getId()))
                                            .filter(Objects::nonNull)
                                            .collect(Collectors.toCollection(ArrayList::new)))
                            .build());
        }
    }

    /**
     * Replaces a personal definition's slots and options with exactly what the request describes,
     * keeping the rows the request still references (and with them their ids, their lineage back to
     * the shared definition, and any collection wargear selections pointing at them).
     *
     * <p>Options are detached from their slots and the removed ones deleted before the slots
     * themselves are touched, so no join row ever outlives the slot it points at. Each phase is
     * flushed because Hibernate would otherwise order every insert ahead of every delete at commit
     * and trip the foreign keys and the (model definition, name) uniqueness constraint on slots.
     */
    private void applyChildren(
            CurrentAuthenticatedUser currentUser, UUID modelDefinitionId, UpsertModelDefinitionDraftRequest request) {
        var existingOptions =
                wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(modelDefinitionId)).stream()
                        .collect(Collectors.toMap(WargearOptionEntity::getId, option -> option));
        var requestedOptionIds =
                request.getWargearOptions().stream()
                        .map(UpsertWargearOptionDraftRequest::getId)
                        .collect(Collectors.toSet());

        for (var option : existingOptions.values()) {
            option.setAttachmentSlots(new ArrayList<>());
            wargearOptionRepository.save(option);
        }
        var removedOptions =
                existingOptions.values().stream()
                        .filter(option -> !requestedOptionIds.contains(option.getId()))
                        .toList();
        removedOptions.forEach(option -> existingOptions.remove(option.getId()));
        wargearOptionRepository.deleteAll(removedOptions);
        wargearOptionRepository.flush();

        var resolvedSlotByRequestId = applySlots(modelDefinitionId, request.getAttachmentSlots());

        for (UpsertWargearOptionDraftRequest optionRequest : request.getWargearOptions()) {
            var slots =
                    optionRequest.getAttachmentSlotIds().stream()
                            .map(resolvedSlotByRequestId::get)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toCollection(ArrayList::new));
            var option =
                    existingOptions.getOrDefault(
                            optionRequest.getId(),
                            WargearOptionEntity.builder().modelDefinitionId(modelDefinitionId).build());
            option.setWargearDefinition(resolveWargearDefinition(currentUser, optionRequest));
            option.setDefault(Boolean.TRUE.equals(optionRequest.getIsDefault()));
            option.setAttachmentSlots(slots);
            wargearOptionRepository.save(option);
        }
    }

    /** Upserts the requested slots, returning each request id mapped to the row that now backs it. */
    private Map<UUID, AttachmentSlotEntity> applySlots(
            UUID modelDefinitionId, List<UpsertAttachmentSlotDraftRequest> slotRequests) {
        var existingSlots =
                attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(modelDefinitionId)).stream()
                        .collect(Collectors.toMap(AttachmentSlotEntity::getId, slot -> slot));

        var kept =
                slotRequests.stream()
                        .map(UpsertAttachmentSlotDraftRequest::getId)
                        .collect(Collectors.toSet());
        attachmentSlotRepository.deleteAll(
                existingSlots.values().stream().filter(slot -> !kept.contains(slot.getId())).toList());
        attachmentSlotRepository.flush();

        Map<UUID, AttachmentSlotEntity> resolvedSlotByRequestId = new HashMap<>();
        for (UpsertAttachmentSlotDraftRequest slotRequest : slotRequests) {
            var existing = existingSlots.get(slotRequest.getId());
            var slot =
                    existing != null
                            ? existing
                            : AttachmentSlotEntity.builder().modelDefinitionId(modelDefinitionId).build();
            slot.setName(slotRequest.getName());
            slot.setType(slotRequest.getType());
            resolvedSlotByRequestId.put(slotRequest.getId(), attachmentSlotRepository.save(slot));
        }
        attachmentSlotRepository.flush();
        return resolvedSlotByRequestId;
    }

    /**
     * Resolves the wargear a personal option points at: by id when the client picked an existing
     * one, otherwise by name, preferring wargear this user already named over the shared catalogue
     * so their own spelling wins, and creating a personal definition when the name is new to both.
     *
     * <p>A name the shared catalogue already has binds to the shared row rather than duplicating
     * it, which is the whole point of having one definition per piece of wargear.
     */
    private WargearDefinitionEntity resolveWargearDefinition(
            CurrentAuthenticatedUser currentUser, UpsertWargearOptionDraftRequest optionRequest) {
        if (optionRequest.getWargearDefinitionId() != null) {
            return requireUsableWargear(currentUser, optionRequest.getWargearDefinitionId());
        }
        return wargearDefinitionRepository
                .findFirstByOwnerUserIdAndNameIgnoreCase(currentUser.id(), optionRequest.getName())
                .or(
                        () ->
                                wargearDefinitionRepository
                                        .findFirstByOwnerUserIdIsNullAndNameIgnoreCase(
                                                optionRequest.getName()))
                .orElseGet(
                        () ->
                                wargearDefinitionRepository.save(
                                        WargearDefinitionEntity.builder()
                                                .ownerUserId(currentUser.id())
                                                .name(optionRequest.getName())
                                                .build()));
    }

    /** Shared wargear, or this user's own - never another user's private definition. */
    private WargearDefinitionEntity requireUsableWargear(
            CurrentAuthenticatedUser currentUser, UUID wargearDefinitionId) {
        var wargear =
                wargearDefinitionRepository
                        .findById(wargearDefinitionId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Wargear definition not found: " + wargearDefinitionId));
        if (wargear.getOwnerUserId() != null && !wargear.getOwnerUserId().equals(currentUser.id())) {
            throw new NotFoundException("Wargear definition not found: " + wargearDefinitionId);
        }
        return wargear;
    }

    private ModelDefinition toDtoWithChildren(ModelDefinitionEntity entity) {
        var slots = attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(entity.getId()));
        var options = wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(entity.getId()));
        return modelDefinitionMapper
                .toDto(entity)
                .attachmentSlots(slots.stream().map(modelDefinitionMapper::toDto).toList())
                .wargearOptions(options.stream().map(modelDefinitionMapper::toDto).toList());
    }
}

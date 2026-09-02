package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.error.ConflictException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.AttachmentSlot;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.WargearOption;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModelDefinitionsService {
    private final ModelDefinitionRepository modelDefinitionRepository;
    private final AttachmentSlotRepository attachmentSlotRepository;
    private final WargearOptionRepository wargearOptionRepository;
    private final ModelDefinitionMapper modelDefinitionMapper;
    private final CollectionModelRepository collectionModelRepository;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    /**
     * Deletes a published model definition and all its attachment slots/wargear options, any open
     * draft for it, and its publish history (all cascade via FK). Refuses (409) if any user's
     * collection models still reference it, since those rows are protected by an {@code ON DELETE
     * RESTRICT} foreign key and would otherwise fail with an opaque database error.
     */
    @Transactional
    public void deleteModelDefinition(UUID modelDefinitionId) {
        if (!modelDefinitionRepository.existsById(modelDefinitionId)) {
            throw new NotFoundException("Model definition not found: " + modelDefinitionId);
        }
        var inUseCount = collectionModelRepository.countByModelDefinitionId(modelDefinitionId);
        if (inUseCount > 0) {
            throw new ConflictException(
                    "Cannot delete: this model definition is still used by "
                            + inUseCount
                            + " collection model(s). Remove or reassign them first.");
        }
        modelDefinitionRepository.deleteById(modelDefinitionId);
    }

    /**
     * The catalogue as the caller should see it: the shared definitions plus anything the signed-in
     * user has added or customised. Anonymous callers (this endpoint is open for preview mode) get
     * the shared catalogue alone.
     *
     * <p>A customisation is listed <em>alongside</em> the definition it was forked from rather than
     * replacing it, so a user who has tweaked a model can still add the stock version - the two are
     * genuinely different things to own. Callers are expected to tell them apart using
     * {@code ownerUserId} and {@code baseModelDefinitionId}, because a customisation usually keeps
     * the original's name and is otherwise indistinguishable.
     */
    public List<ModelDefinition> getAllModelDefinitions() {
        var ownerUserId =
                authenticatedUserProvider
                        .findCurrentUser()
                        .map(CurrentAuthenticatedUser::id)
                        .orElse(null);
        return withChildren(visibleEntities(ownerUserId));
    }

    /**
     * The shared catalogue alone, never a caller's personal definitions. This is what admins curate:
     * personal definitions belong to their owner, are not editable here, and carry personal factions
     * that the shared faction list deliberately omits.
     */
    public List<ModelDefinition> getSharedModelDefinitions() {
        return withChildren(modelDefinitionRepository.findAllByOwnerUserIdIsNull());
    }

    private List<ModelDefinitionEntity> visibleEntities(UUID ownerUserId) {
        var globals = modelDefinitionRepository.findAllByOwnerUserIdIsNull();
        if (ownerUserId == null) {
            return globals;
        }

        List<ModelDefinitionEntity> visible = new ArrayList<>(globals);
        visible.addAll(modelDefinitionRepository.findAllByOwnerUserId(ownerUserId));
        return visible;
    }

    private List<ModelDefinition> withChildren(List<ModelDefinitionEntity> modelDefinitionEntities) {
        var modelDefinitionIds = modelDefinitionEntities.stream().map(ModelDefinitionEntity::getId).toList();

        Map<UUID, List<AttachmentSlot>> attachmentSlotsByModelDefinitionId =
                attachmentSlotRepository.findAllByModelDefinitionIdIn(modelDefinitionIds).stream()
                        .collect(
                                Collectors.groupingBy(
                                        AttachmentSlotEntity::getModelDefinitionId,
                                        Collectors.mapping(
                                                modelDefinitionMapper::toDto, Collectors.toList())));

        Map<UUID, List<WargearOption>> wargearOptionsByModelDefinitionId =
                wargearOptionRepository.findAllByModelDefinitionIdIn(modelDefinitionIds).stream()
                        .collect(
                                Collectors.groupingBy(
                                        WargearOptionEntity::getModelDefinitionId,
                                        Collectors.mapping(
                                                modelDefinitionMapper::toDto, Collectors.toList())));

        return modelDefinitionEntities.stream()
                .map(
                        entity ->
                                modelDefinitionMapper
                                        .toDto(entity)
                                        .attachmentSlots(
                                                attachmentSlotsByModelDefinitionId.getOrDefault(
                                                        entity.getId(), List.of()))
                                        .wargearOptions(
                                                wargearOptionsByModelDefinitionId.getOrDefault(
                                                        entity.getId(), List.of())))
                .toList();
    }

    /**
     * Maps an entity straight to a fully populated DTO, for callers that already hold the entity
     * and would otherwise have to map it themselves before enriching it.
     */
    public ModelDefinition toEnrichedDto(ModelDefinitionEntity modelDefinitionEntity) {
        return withChildren(List.of(modelDefinitionEntity)).getFirst();
    }

    /**
     * Populates the {@code attachmentSlots} and {@code wargearOptions} of a single, already
     * mapped {@link ModelDefinition} DTO. Used by other services (e.g. collection models) that
     * embed a model definition and need it fully populated, not just its id/name.
     */
    public ModelDefinition enrichWithAttachmentSlotsAndWargearOptions(ModelDefinition modelDefinition) {
        return enrichAllWithAttachmentSlotsAndWargearOptions(List.of(modelDefinition)).getFirst();
    }

    /**
     * Batched form of {@link #enrichWithAttachmentSlotsAndWargearOptions(ModelDefinition)}: fetches
     * attachment slots and wargear options for all given model definitions with two {@code IN}
     * queries total (rather than two queries per model definition), avoiding an N+1 query pattern
     * when enriching a whole list (e.g., every model in a collection).
     */
    public List<ModelDefinition> enrichAllWithAttachmentSlotsAndWargearOptions(
            List<ModelDefinition> modelDefinitions) {
        var modelDefinitionIds =
                modelDefinitions.stream().map(ModelDefinition::getId).distinct().toList();

        Map<UUID, List<AttachmentSlot>> attachmentSlotsByModelDefinitionId =
                attachmentSlotRepository.findAllByModelDefinitionIdIn(modelDefinitionIds).stream()
                        .collect(
                                Collectors.groupingBy(
                                        AttachmentSlotEntity::getModelDefinitionId,
                                        Collectors.mapping(
                                                modelDefinitionMapper::toDto, Collectors.toList())));

        Map<UUID, List<WargearOption>> wargearOptionsByModelDefinitionId =
                wargearOptionRepository.findAllByModelDefinitionIdIn(modelDefinitionIds).stream()
                        .collect(
                                Collectors.groupingBy(
                                        WargearOptionEntity::getModelDefinitionId,
                                        Collectors.mapping(
                                                modelDefinitionMapper::toDto, Collectors.toList())));

        return modelDefinitions.stream()
                .map(
                        modelDefinition ->
                                modelDefinition
                                        .attachmentSlots(
                                                attachmentSlotsByModelDefinitionId.getOrDefault(
                                                        modelDefinition.getId(), List.of()))
                                        .wargearOptions(
                                                wargearOptionsByModelDefinitionId.getOrDefault(
                                                        modelDefinition.getId(), List.of())))
                .toList();
    }
}

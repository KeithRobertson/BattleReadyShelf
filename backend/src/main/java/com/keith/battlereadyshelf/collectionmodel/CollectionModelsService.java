package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.ChangeModelDefinitionPreview;
import com.keith.battlereadyshelf.generated.model.CollectionModel;
import com.keith.battlereadyshelf.generated.model.CollectionModelImage;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.WargearOption;
import com.keith.battlereadyshelf.generated.model.WargearRemapEntry;
import com.keith.battlereadyshelf.generated.model.WargearRemapOutcome;
import com.keith.battlereadyshelf.generated.model.WargearSelection;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionEntity;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionMapper;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionRepository;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionsService;
import com.keith.battlereadyshelf.modeldefinition.WargearOptionRepository;
import com.keith.battlereadyshelf.storage.PresignedUrlService;

import jakarta.annotation.Nullable;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class CollectionModelsService {
    private final CollectionModelRepository collectionModelRepository;
    private final ArmyCollectionRepository armyCollectionRepository;
    private final ModelDefinitionRepository modelDefinitionRepository;
    private final WargearOptionRepository wargearOptionRepository;
    private final CollectionModelImageRepository collectionModelImageRepository;
    private final CollectionModelWargearSelectionRepository collectionModelWargearSelectionRepository;
    private final CollectionModelMagnetizedSlotRepository collectionModelMagnetizedSlotRepository;
    private final CollectionModelIdentityRepository collectionModelIdentityRepository;
    private final CollectionModelMapper collectionModelMapper;
    private final CollectionModelImageMapper collectionModelImageMapper;
    private final ModelDefinitionMapper modelDefinitionMapper;
    private final ModelDefinitionsService modelDefinitionsService;
    private final PresignedUrlService presignedUrlService;
    private final CollectionModelStatusMapper collectionModelStatusMapper;
    private final WargearRemapPlanner wargearRemapPlanner;

    public List<CollectionModel> getCollectionModels(UUID userId, UUID armyCollectionId) {
        requireViewableArmyCollection(userId, armyCollectionId);

        return toDtosWithImages(collectionModelRepository.findAllByArmyCollectionId(armyCollectionId));
    }

    @Transactional
    public CollectionModel createCollectionModel(
            UUID userId, UUID armyCollectionId, CollectionModel collectionModel) {
        requireOwnedArmyCollection(userId, armyCollectionId);

        var modelDefinition = requireUsableModelDefinition(userId, collectionModel.getModelDefinitionId());

        var savedCollectionModel =
                collectionModelRepository.save(
                        collectionModelMapper.toEntity(armyCollectionId, modelDefinition, collectionModel));
        applyDefaultLoadout(savedCollectionModel, modelDefinition.getId());

        return toDtoWithImages(savedCollectionModel);
    }

    /**
     * Creates {@code count} unnamed collection models of the given model definition in one go (e.g.
     * adding 60 Poxwalkers at once) so they can be individually named afterwards.
     */
    @Transactional
    public List<CollectionModel> bulkCreateCollectionModels(
            UUID userId,
            UUID armyCollectionId,
            UUID modelDefinitionId,
            int count,
            @Nullable com.keith.battlereadyshelf.generated.model.CollectionModelStatus status) {
        requireOwnedArmyCollection(userId, armyCollectionId);

        var modelDefinition = requireUsableModelDefinition(userId, modelDefinitionId);

        var newEntities =
                Stream.generate(
                                () ->
                                        CollectionModelEntity.builder()
                                                .armyCollectionId(armyCollectionId)
                                                .modelDefinition(modelDefinition)
                                                .status(collectionModelStatusMapper.toEntityStatus(status))
                                                .build())
                        .limit(count)
                        .toList();

        var saved = collectionModelRepository.saveAll(newEntities);
        applyDefaultLoadouts(saved, modelDefinitionId);
        return toDtosWithImages(saved);
    }

    /**
     * Renames/updates the name, description, finished-on date, and/or wargear slot assignments of
     * an existing collection model.
     */
    @Transactional
    public CollectionModel updateCollectionModel(
            UUID userId,
            UUID collectionModelId,
            String name,
            String description,
            LocalDate finishedOn,
            com.keith.battlereadyshelf.generated.model.CollectionModelStatus status,
            UUID modelDefinitionId,
            List<WargearSelection> wargearSelections,
            List<UUID> magnetizedSlotIds,
            List<UUID> alternateModelDefinitionIds) {
        var collectionModel = requireOwnedCollectionModel(userId, collectionModelId);

        if (name != null) {
            collectionModel.setName(name);
        }
        if (description != null) {
            collectionModel.setDescription(description);
        }
        if (finishedOn != null) {
            collectionModel.setFinishedOn(finishedOn);
        }
        if (status != null) {
            collectionModel.setStatus(CollectionModelStatus.valueOf(status.name()));
        }

        var isMovingToAnotherDefinition =
                modelDefinitionId != null && !modelDefinitionId.equals(collectionModel.getModelDefinition().getId());
        if (isMovingToAnotherDefinition) {
            changeModelDefinition(userId, collectionModel, modelDefinitionId, alternateModelDefinitionIds);
        } else {
            Set<UUID> magnetized =
                    magnetizedSlotIds != null
                            ? magnetizedSlotIds.stream()
                                    .filter(Objects::nonNull)
                                    .collect(Collectors.toCollection(LinkedHashSet::new))
                            : magnetizedSlotIdsOf(collectionModel.getId());
            if (magnetizedSlotIds != null) {
                replaceMagnetizedSlots(collectionModel.getId(), magnetizedSlotIds);
            }
            if (wargearSelections != null) {
                replaceWargearSelections(collectionModel.getId(), wargearSelections, magnetized);
            }
            if (alternateModelDefinitionIds != null) {
                replaceIdentities(userId, collectionModel, alternateModelDefinitionIds);
            }
        }

        return toDtoWithImages(collectionModelRepository.save(collectionModel));
    }

    /**
     * Previews moving a collection model onto a different definition without persisting anything,
     * so the user can be shown what it would do to their recorded loadout first.
     */
    public ChangeModelDefinitionPreview previewModelDefinitionChange(
            UUID userId, UUID collectionModelId, UUID modelDefinitionId) {
        var collectionModel = requireOwnedCollectionModel(userId, collectionModelId);
        var target = requireUsableModelDefinition(userId, modelDefinitionId);

        var entries = planRemap(collectionModel, target);
        return new ChangeModelDefinitionPreview(modelDefinitionId, entries.stream().map(this::toPreviewEntry).toList())
                .modelDefinitionName(target.getName());
    }

    private WargearRemapEntry toPreviewEntry(WargearRemapPlanner.RemapEntry entry) {
        return new WargearRemapEntry(entry.slotName(), entry.wargearName(), entry.outcome())
                .targetSlotName(entry.targetSlotName());
    }

    private List<WargearRemapPlanner.RemapEntry> planRemap(
            CollectionModelEntity collectionModel, ModelDefinitionEntity target) {
        var current = modelDefinitionsService.toEnrichedDto(collectionModel.getModelDefinition());
        var selections =
                collectionModelWargearSelectionRepository.findAllByCollectionModelId(collectionModel.getId());
        var retained = retainedOptionsAfterSwitch(collectionModel, target.getId());

        return wargearRemapPlanner.plan(
                current, modelDefinitionsService.toEnrichedDto(target), selections, retained);
    }

    /**
     * Options the miniature will still own after switching current identity: the old current type
     * (it becomes an alternate when switching to an existing alias) plus every other alternate
     * except the target.
     */
    private List<WargearOption> retainedOptionsAfterSwitch(
            CollectionModelEntity collectionModel, UUID targetDefinitionId) {
        var remainingDefinitionIds = new LinkedHashSet<UUID>();
        remainingDefinitionIds.add(collectionModel.getModelDefinition().getId());
        for (var identity :
                collectionModelIdentityRepository.findAllByCollectionModelId(collectionModel.getId())) {
            if (!targetDefinitionId.equals(identity.getModelDefinitionId())) {
                remainingDefinitionIds.add(identity.getModelDefinitionId());
            }
        }
        remainingDefinitionIds.remove(targetDefinitionId);

        if (remainingDefinitionIds.isEmpty()) {
            return List.of();
        }
        var stubs = remainingDefinitionIds.stream().map(id -> new ModelDefinition().id(id)).toList();
        return modelDefinitionsService.enrichAllWithAttachmentSlotsAndWargearOptions(stubs).stream()
                .flatMap(definition -> definition.getWargearOptions() == null ? Stream.of() : definition.getWargearOptions().stream())
                .toList();
    }

    /**
     * Repoints a model at a different definition, carrying its loadout across as far as the slots
     * and wargear line up. The old selections are all removed first because they reference the old
     * definition's slots, which no longer apply.
     */
    private void changeModelDefinition(
            UUID userId,
            CollectionModelEntity collectionModel,
            UUID modelDefinitionId,
            @Nullable List<UUID> requestedAlternateIds) {
        var previousDefinition = collectionModel.getModelDefinition();
        var target = requireUsableModelDefinition(userId, modelDefinitionId);
        var currentDto = modelDefinitionsService.toEnrichedDto(previousDefinition);
        var targetDto = modelDefinitionsService.toEnrichedDto(target);
        var plan = planRemap(collectionModel, target);

        collectionModelWargearSelectionRepository.deleteAllByCollectionModelId(collectionModel.getId());
        collectionModelWargearSelectionRepository.flush();

        var carriedOver =
                plan.stream()
                        .filter(entry -> entry.outcome() != WargearRemapOutcome.DROPPED)
                        .map(
                                entry ->
                                        CollectionModelWargearSelectionEntity.builder()
                                                .collectionModelId(collectionModel.getId())
                                                .attachmentSlotId(entry.targetSlotId())
                                                .wargearOptionId(entry.targetWargearOptionId())
                                                .customLabel(entry.customLabel())
                                                .linkGroupId(entry.linkGroupId())
                                                .equipped(entry.equipped())
                                                .build())
                        .toList();
        collectionModelWargearSelectionRepository.saveAll(carriedOver);

        remapMagnetizedSlots(collectionModel.getId(), currentDto, targetDto);

        var existingAlternateIds =
                collectionModelIdentityRepository.findAllByCollectionModelId(collectionModel.getId()).stream()
                        .map(CollectionModelIdentityEntity::getModelDefinitionId)
                        .collect(Collectors.toCollection(LinkedHashSet::new));
        List<UUID> nextAlternates;
        if (requestedAlternateIds != null) {
            nextAlternates = requestedAlternateIds;
        } else if (existingAlternateIds.contains(target.getId())) {
            existingAlternateIds.remove(target.getId());
            existingAlternateIds.add(previousDefinition.getId());
            nextAlternates = List.copyOf(existingAlternateIds);
        } else {
            nextAlternates = List.copyOf(existingAlternateIds);
        }

        collectionModel.setModelDefinition(target);
        replaceIdentities(userId, collectionModel, nextAlternates);
    }

    private void remapMagnetizedSlots(UUID collectionModelId, ModelDefinition current, ModelDefinition target) {
        var currentNameById =
                slotsOf(current).stream()
                        .filter(slot -> slot.getId() != null)
                        .collect(
                                Collectors.toMap(
                                        com.keith.battlereadyshelf.generated.model.AttachmentSlot::getId,
                                        slot -> normalise(slot.getName()),
                                        (a, b) -> a));
        var targetIdByName =
                slotsOf(target).stream()
                        .filter(slot -> slot.getId() != null)
                        .collect(
                                Collectors.toMap(
                                        slot -> normalise(slot.getName()),
                                        com.keith.battlereadyshelf.generated.model.AttachmentSlot::getId,
                                        (a, b) -> a));

        var remapped = new LinkedHashSet<UUID>();
        for (var row :
                collectionModelMagnetizedSlotRepository.findAllByCollectionModelIdIn(List.of(collectionModelId))) {
            var name = currentNameById.get(row.getAttachmentSlotId());
            var targetSlotId = name == null ? null : targetIdByName.get(name);
            if (targetSlotId != null) {
                remapped.add(targetSlotId);
            }
        }
        replaceMagnetizedSlots(collectionModelId, List.copyOf(remapped));
    }

    private void replaceMagnetizedSlots(UUID collectionModelId, List<UUID> magnetizedSlotIds) {
        collectionModelMagnetizedSlotRepository.deleteAllByCollectionModelId(collectionModelId);
        collectionModelMagnetizedSlotRepository.flush();
        var unique = new LinkedHashSet<>(magnetizedSlotIds);
        unique.remove(null);
        collectionModelMagnetizedSlotRepository.saveAll(
                unique.stream()
                        .map(
                                slotId ->
                                        CollectionModelMagnetizedSlotEntity.builder()
                                                .collectionModelId(collectionModelId)
                                                .attachmentSlotId(slotId)
                                                .build())
                        .toList());
        collectionModelMagnetizedSlotRepository.flush();
    }

    private void replaceIdentities(
            UUID userId, CollectionModelEntity collectionModel, List<UUID> alternateModelDefinitionIds) {
        var currentId = collectionModel.getModelDefinition().getId();
        var unique = new LinkedHashSet<UUID>();
        for (var id : alternateModelDefinitionIds) {
            if (id != null && !id.equals(currentId)) {
                requireUsableModelDefinition(userId, id);
                unique.add(id);
            }
        }
        collectionModelIdentityRepository.deleteAllByCollectionModelId(collectionModel.getId());
        collectionModelIdentityRepository.flush();
        collectionModelIdentityRepository.saveAll(
                unique.stream()
                        .map(
                                definitionId ->
                                        CollectionModelIdentityEntity.builder()
                                                .collectionModelId(collectionModel.getId())
                                                .modelDefinitionId(definitionId)
                                                .build())
                        .toList());
    }

    private Set<UUID> magnetizedSlotIdsOf(UUID collectionModelId) {
        return collectionModelMagnetizedSlotRepository.findAllByCollectionModelIdIn(List.of(collectionModelId)).stream()
                .map(CollectionModelMagnetizedSlotEntity::getAttachmentSlotId)
                .collect(Collectors.toSet());
    }

    private void replaceWargearSelections(
            UUID collectionModelId, List<WargearSelection> wargearSelections, Set<UUID> magnetizedSlotIds) {
        for (var selection : wargearSelections) {
            if (selection.getWargearOptionId() != null
                    && selection.getCustomLabel() != null
                    && !selection.getCustomLabel().isBlank()) {
                throw new BadRequestException(
                        "A wargear selection cannot have both a wargearOptionId and a customLabel;"
                                + " choose one for slot "
                                + selection.getAttachmentSlotId());
            }
        }

        var filledBySlot = new HashMap<UUID, List<WargearSelection>>();
        for (var selection : wargearSelections) {
            if (!isFilled(selection) || selection.getAttachmentSlotId() == null) {
                continue;
            }
            filledBySlot
                    .computeIfAbsent(selection.getAttachmentSlotId(), key -> new ArrayList<>())
                    .add(selection);
        }

        for (var entry : filledBySlot.entrySet()) {
            var slotId = entry.getKey();
            var filled = entry.getValue();
            var magnetized = magnetizedSlotIds.contains(slotId);
            if (!magnetized && filled.size() > 1) {
                throw new BadRequestException(
                        "Slot " + slotId + " is not magnetised and cannot hold more than one wargear assignment");
            }
            long equippedCount = filled.stream().filter(selection -> isEquipped(selection, filled.size())).count();
            if (equippedCount > 1) {
                throw new BadRequestException("Slot " + slotId + " has more than one equipped wargear assignment");
            }
        }

        // Hibernate's default flush ordering runs inserts before deletes within a transaction,
        // so without an explicit flush here, re-inserting a selection for the same slot would
        // violate the unique equipped-slot index before the old row is actually removed.
        collectionModelWargearSelectionRepository.deleteAllByCollectionModelId(collectionModelId);
        collectionModelWargearSelectionRepository.flush();
        var newSelections =
                filledBySlot.values().stream()
                        .flatMap(List::stream)
                        .map(
                                selection ->
                                        CollectionModelWargearSelectionEntity.builder()
                                                .collectionModelId(collectionModelId)
                                                .attachmentSlotId(selection.getAttachmentSlotId())
                                                .wargearOptionId(selection.getWargearOptionId())
                                                .customLabel(
                                                        selection.getCustomLabel() != null
                                                                        && !selection.getCustomLabel().isBlank()
                                                                ? selection.getCustomLabel().trim()
                                                                : null)
                                                .linkGroupId(selection.getLinkGroupId())
                                                .equipped(isEquipped(selection, filledBySlot.get(selection.getAttachmentSlotId()).size()))
                                                .build())
                        .toList();
        collectionModelWargearSelectionRepository.saveAll(newSelections);
    }

    private static boolean isFilled(WargearSelection selection) {
        return selection.getWargearOptionId() != null
                || (selection.getCustomLabel() != null && !selection.getCustomLabel().isBlank());
    }

    private static boolean isEquipped(WargearSelection selection, int filledInSlot) {
        if (Boolean.TRUE.equals(selection.getEquipped())) {
            return true;
        }
        if (Boolean.FALSE.equals(selection.getEquipped())) {
            return false;
        }
        return filledInSlot == 1;
    }

    private void applyDefaultLoadout(CollectionModelEntity collectionModel, UUID modelDefinitionId) {
        applyDefaultLoadouts(List.of(collectionModel), modelDefinitionId);
    }

    private void applyDefaultLoadouts(List<CollectionModelEntity> collectionModels, UUID modelDefinitionId) {
        if (collectionModels.isEmpty()) {
            return;
        }
        var plan =
                DefaultLoadoutPlanner.plan(
                        wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(modelDefinitionId)));
        if (plan.isEmpty()) {
            return;
        }
        collectionModelWargearSelectionRepository.saveAll(
                collectionModels.stream()
                        .flatMap(model -> DefaultLoadoutPlanner.selectionsFor(model.getId(), plan).stream())
                        .toList());
    }

    /**
     * Deletes a collection model along with its images (both the R2 objects and the DB rows; the DB
     * rows would also cascade-delete on their own, but the R2 objects need explicit cleanup since
     * Postgres cascades don't reach out-of-database storage).
     */
    public void deleteCollectionModel(UUID userId, UUID collectionModelId) {
        var collectionModel = requireOwnedCollectionModel(userId, collectionModelId);
        deleteImagesAndModel(collectionModel);
    }

    /**
     * Deletes multiple collection models (and their images) at once. Ids that don't exist or don't
     * belong to this army collection are silently skipped rather than failing the whole batch.
     */
    public void bulkDeleteCollectionModels(UUID userId, UUID armyCollectionId, List<UUID> collectionModelIds) {
        requireOwnedArmyCollection(userId, armyCollectionId);

        collectionModelRepository.findAllById(collectionModelIds.stream().distinct().toList()).stream()
                .filter(model -> model.getArmyCollectionId().equals(armyCollectionId))
                .forEach(this::deleteImagesAndModel);
    }

    private void deleteImagesAndModel(CollectionModelEntity collectionModel) {
        var images = collectionModelImageRepository.findAllByCollectionModelId(collectionModel.getId());
        images.forEach(
                image -> {
                    deleteVariantIfPresent(image.getLarge());
                    deleteVariantIfPresent(image.getThumbnail());
                });
        collectionModelImageRepository.deleteAll(images);
        collectionModelRepository.delete(collectionModel);
    }

    private void deleteVariantIfPresent(ImageVariant variant) {
        if (variant != null && variant.getStorageKey() != null) {
            presignedUrlService.deleteObject(variant.getStorageKey());
        }
    }

    /**
     * Verifies the given collection model exists and belongs (transitively, via its army
     * collection) to the given user, returning the entity if so.
     */
    public CollectionModelEntity requireOwnedCollectionModel(UUID userId, UUID collectionModelId) {
        var collectionModel =
                collectionModelRepository
                        .findById(collectionModelId)
                        .orElseThrow(() -> new NotFoundException("Collection model not found: " + collectionModelId));

        requireOwnedArmyCollection(userId, collectionModel.getArmyCollectionId());

        return collectionModel;
    }

    /**
     * Maps a batch of collection model entities to fully-populated DTOs (model definition, images
     * with presigned URLs, and wargear selections), fetching each of those associations with a
     * single {@code IN} query across the whole batch rather than one query per entity, to avoid an
     * N+1 query pattern when listing a whole army collection.
     */
    private List<CollectionModel> toDtosWithImages(List<CollectionModelEntity> entities) {
        if (entities.isEmpty()) {
            return List.of();
        }

        var collectionModelIds = entities.stream().map(CollectionModelEntity::getId).toList();

        var imagesByCollectionModelId =
                collectionModelImageRepository.findAllByCollectionModelIdIn(collectionModelIds).stream()
                        .collect(Collectors.groupingBy(CollectionModelImageEntity::getCollectionModelId));

        var wargearSelectionsByCollectionModelId =
                collectionModelWargearSelectionRepository.findAllByCollectionModelIdIn(collectionModelIds).stream()
                        .collect(Collectors.groupingBy(CollectionModelWargearSelectionEntity::getCollectionModelId));

        var magnetizedByCollectionModelId =
                collectionModelMagnetizedSlotRepository.findAllByCollectionModelIdIn(collectionModelIds).stream()
                        .collect(Collectors.groupingBy(CollectionModelMagnetizedSlotEntity::getCollectionModelId));

        var identitiesByCollectionModelId =
                collectionModelIdentityRepository.findAllByCollectionModelIdIn(collectionModelIds).stream()
                        .collect(Collectors.groupingBy(CollectionModelIdentityEntity::getCollectionModelId));

        var dtos = entities.stream().map(collectionModelMapper::toDto).toList();

        var alternateIds =
                identitiesByCollectionModelId.values().stream()
                        .flatMap(List::stream)
                        .map(CollectionModelIdentityEntity::getModelDefinitionId)
                        .collect(Collectors.toCollection(LinkedHashSet::new));
        var alternateEntities = modelDefinitionRepository.findAllById(alternateIds);
        var alternateStubs = alternateEntities.stream().map(modelDefinitionMapper::toDto).toList();

        var toEnrich = new ArrayList<ModelDefinition>();
        for (var dto : dtos) {
            toEnrich.add(dto.getModelDefinition());
        }
        toEnrich.addAll(alternateStubs);
        var enriched = modelDefinitionsService.enrichAllWithAttachmentSlotsAndWargearOptions(toEnrich);
        var enrichedAlternatesById =
                enriched.subList(dtos.size(), enriched.size()).stream()
                        .filter(definition -> definition.getId() != null)
                        .collect(Collectors.toMap(ModelDefinition::getId, definition -> definition, (a, b) -> a));

        for (int i = 0; i < entities.size(); i++) {
            var entity = entities.get(i);
            var dto = dtos.get(i);
            dto.setModelDefinition(enriched.get(i));
            dto.setImages(
                    imagesByCollectionModelId.getOrDefault(entity.getId(), List.of()).stream()
                            .map(this::toImageDtoWithUrls)
                            .toList());
            dto.setWargearSelections(
                    wargearSelectionsByCollectionModelId.getOrDefault(entity.getId(), List.of()).stream()
                            .map(collectionModelMapper::toDto)
                            .toList());
            dto.setMagnetizedSlotIds(
                    magnetizedByCollectionModelId.getOrDefault(entity.getId(), List.of()).stream()
                            .map(CollectionModelMagnetizedSlotEntity::getAttachmentSlotId)
                            .toList());
            var identities = identitiesByCollectionModelId.getOrDefault(entity.getId(), List.of());
            var alternateDefinitionIds =
                    identities.stream().map(CollectionModelIdentityEntity::getModelDefinitionId).toList();
            dto.setAlternateModelDefinitionIds(alternateDefinitionIds);
            dto.setAlternateModelDefinitions(
                    alternateDefinitionIds.stream()
                            .map(enrichedAlternatesById::get)
                            .filter(Objects::nonNull)
                            .toList());
        }

        return dtos;
    }

    private CollectionModel toDtoWithImages(CollectionModelEntity entity) {
        return toDtosWithImages(List.of(entity)).getFirst();
    }

    private CollectionModelImage toImageDtoWithUrls(CollectionModelImageEntity imageEntity) {
        var imageDto = collectionModelImageMapper.toDto(imageEntity);
        imageDto.setLargeUrl(presignDownloadIfPresent(imageEntity.getLarge()));
        imageDto.setThumbnailUrl(presignDownloadIfPresent(imageEntity.getThumbnail()));
        return imageDto;
    }

    private URI presignDownloadIfPresent(ImageVariant variant) {
        return variant == null || variant.getStorageKey() == null
                ? null
                : presignedUrlService.presignDownload(variant.getStorageKey());
    }

    /**
     * Resolves a model definition the user is allowed to build models from: a shared one, or one of
     * their own. Another user's personal definition is reported as not found rather than forbidden,
     * so this cannot be used to probe for the existence of definitions belonging to someone else.
     */
    private ModelDefinitionEntity requireUsableModelDefinition(UUID userId, UUID modelDefinitionId) {
        var modelDefinition =
                modelDefinitionRepository
                        .findById(modelDefinitionId)
                        .orElseThrow(() -> new NotFoundException("Model definition not found: " + modelDefinitionId));

        var ownerUserId = modelDefinition.getOwnerUserId();
        if (ownerUserId != null && !ownerUserId.equals(userId)) {
            throw new NotFoundException("Model definition not found: " + modelDefinitionId);
        }
        return modelDefinition;
    }

    private void requireOwnedArmyCollection(UUID userId, UUID armyCollectionId) {
        var armyCollection =
                armyCollectionRepository
                        .findById(armyCollectionId)
                        .orElseThrow(() -> new NotFoundException("Army collection not found: " + armyCollectionId));

        if (!armyCollection.getUserId().equals(userId)) {
            throw new NotFoundException("Army collection not found: " + armyCollectionId);
        }
    }

    private void requireViewableArmyCollection(UUID userId, UUID armyCollectionId) {
        var armyCollection =
                armyCollectionRepository
                        .findById(armyCollectionId)
                        .orElseThrow(() -> new NotFoundException("Army collection not found: " + armyCollectionId));

        if (!Boolean.TRUE.equals(armyCollection.getIsPublic()) && (!armyCollection.getUserId().equals(userId))) {
            throw new NotFoundException("Army collection not found: " + armyCollectionId);
        }
    }

    private static List<com.keith.battlereadyshelf.generated.model.AttachmentSlot> slotsOf(ModelDefinition definition) {
        return definition.getAttachmentSlots() == null ? List.of() : definition.getAttachmentSlots();
    }

    private static String normalise(@Nullable String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}

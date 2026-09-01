package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.ChangeModelDefinitionPreview;
import com.keith.battlereadyshelf.generated.model.CollectionModel;
import com.keith.battlereadyshelf.generated.model.CollectionModelImage;
import com.keith.battlereadyshelf.generated.model.WargearRemapEntry;
import com.keith.battlereadyshelf.generated.model.WargearRemapOutcome;
import com.keith.battlereadyshelf.generated.model.WargearSelection;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionEntity;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionRepository;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionsService;
import com.keith.battlereadyshelf.storage.PresignedUrlService;

import jakarta.annotation.Nullable;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class CollectionModelsService {
    private final CollectionModelRepository collectionModelRepository;
    private final ArmyCollectionRepository armyCollectionRepository;
    private final ModelDefinitionRepository modelDefinitionRepository;
    private final CollectionModelImageRepository collectionModelImageRepository;
    private final CollectionModelWargearSelectionRepository
            collectionModelWargearSelectionRepository;
    private final CollectionModelMapper collectionModelMapper;
    private final CollectionModelImageMapper collectionModelImageMapper;
    private final ModelDefinitionsService modelDefinitionsService;
    private final PresignedUrlService presignedUrlService;
    private final CollectionModelStatusMapper collectionModelStatusMapper;
    private final WargearRemapPlanner wargearRemapPlanner;

    public List<CollectionModel> getCollectionModels(UUID userId, UUID armyCollectionId) {
        requireViewableArmyCollection(userId, armyCollectionId);

        return toDtosWithImages(
                collectionModelRepository.findAllByArmyCollectionId(armyCollectionId));
    }

    public CollectionModel createCollectionModel(
            UUID userId, UUID armyCollectionId, CollectionModel collectionModel) {
        requireOwnedArmyCollection(userId, armyCollectionId);

        var modelDefinition =
                requireUsableModelDefinition(userId, collectionModel.getModelDefinitionId());

        var savedCollectionModel =
                collectionModelRepository.save(
                        collectionModelMapper.toEntity(
                                armyCollectionId, modelDefinition, collectionModel));

        return toDtoWithImages(savedCollectionModel);
    }

    /**
     * Creates {@code count} unnamed collection models of the given model definition in one go (e.g.
     * adding 60 Poxwalkers at once) so they can be individually named afterwards.
     */
    public List<CollectionModel> bulkCreateCollectionModels(
            UUID userId, UUID armyCollectionId, UUID modelDefinitionId, int count, @Nullable com.keith.battlereadyshelf.generated.model.CollectionModelStatus status) {
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

        return toDtosWithImages(collectionModelRepository.saveAll(newEntities));
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
            List<WargearSelection> wargearSelections) {
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
                modelDefinitionId != null
                        && !modelDefinitionId.equals(collectionModel.getModelDefinition().getId());
        if (isMovingToAnotherDefinition) {
            changeModelDefinition(userId, collectionModel, modelDefinitionId);
        } else if (wargearSelections != null) {
            replaceWargearSelections(collectionModelId, wargearSelections);
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
        return new ChangeModelDefinitionPreview(
                modelDefinitionId, entries.stream().map(this::toPreviewEntry).toList())
                .modelDefinitionName(target.getName());
    }

    private WargearRemapEntry toPreviewEntry(WargearRemapPlanner.RemapEntry entry) {
        return new WargearRemapEntry(entry.slotName(), entry.wargearName(), entry.outcome())
                .targetSlotName(entry.targetSlotName());
    }

    private List<WargearRemapPlanner.RemapEntry> planRemap(
            CollectionModelEntity collectionModel, ModelDefinitionEntity target) {
        var current =
                modelDefinitionsService.toEnrichedDto(collectionModel.getModelDefinition());
        var selections =
                collectionModelWargearSelectionRepository.findAllByCollectionModelId(
                        collectionModel.getId());

        return wargearRemapPlanner.plan(
                current, modelDefinitionsService.toEnrichedDto(target), selections);
    }

    /**
     * Repoints a model at a different definition, carrying its loadout across as far as the slots
     * and wargear line up. The old selections are all removed first because they reference the old
     * definition's slots, which no longer apply.
     */
    private void changeModelDefinition(
            UUID userId, CollectionModelEntity collectionModel, UUID modelDefinitionId) {
        var target = requireUsableModelDefinition(userId, modelDefinitionId);
        var plan = planRemap(collectionModel, target);

        collectionModelWargearSelectionRepository.deleteAllByCollectionModelId(
                collectionModel.getId());
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
                                                .build())
                        .toList();
        collectionModelWargearSelectionRepository.saveAll(carriedOver);

        collectionModel.setModelDefinition(target);
    }

    private void replaceWargearSelections(
            UUID collectionModelId, List<WargearSelection> wargearSelections) {
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

        // Hibernate's default flush ordering runs inserts before deletes within a transaction,
        // so without an explicit flush here, re-inserting a selection for the same slot would
        // violate the unique (collection_model_id, attachment_slot_id) constraint before the
        // old row is actually removed.
        collectionModelWargearSelectionRepository.deleteAllByCollectionModelId(collectionModelId);
        collectionModelWargearSelectionRepository.flush();
        var newSelections =
                wargearSelections.stream()
                        .map(
                                selection ->
                                        CollectionModelWargearSelectionEntity.builder()
                                                .collectionModelId(collectionModelId)
                                                .attachmentSlotId(selection.getAttachmentSlotId())
                                                .wargearOptionId(selection.getWargearOptionId())
                                                .customLabel(
                                                        selection.getCustomLabel() != null
                                                                        && !selection
                                                                                .getCustomLabel()
                                                                                .isBlank()
                                                                ? selection.getCustomLabel().trim()
                                                                : null)
                                                .build())
                        .toList();
        collectionModelWargearSelectionRepository.saveAll(newSelections);
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
    public void bulkDeleteCollectionModels(
            UUID userId, UUID armyCollectionId, List<UUID> collectionModelIds) {
        requireOwnedArmyCollection(userId, armyCollectionId);

        collectionModelRepository
                .findAllById(collectionModelIds.stream().distinct().toList())
                .stream()
                .filter(model -> model.getArmyCollectionId().equals(armyCollectionId))
                .forEach(this::deleteImagesAndModel);
    }

    private void deleteImagesAndModel(CollectionModelEntity collectionModel) {
        var images =
                collectionModelImageRepository.findAllByCollectionModelId(collectionModel.getId());
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
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Collection model not found: "
                                                        + collectionModelId));

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
                collectionModelImageRepository
                        .findAllByCollectionModelIdIn(collectionModelIds)
                        .stream()
                        .collect(
                                Collectors.groupingBy(
                                        CollectionModelImageEntity::getCollectionModelId));

        var wargearSelectionsByCollectionModelId =
                collectionModelWargearSelectionRepository
                        .findAllByCollectionModelIdIn(collectionModelIds)
                        .stream()
                        .collect(
                                Collectors.groupingBy(
                                        CollectionModelWargearSelectionEntity
                                                ::getCollectionModelId));

        var dtos = entities.stream().map(collectionModelMapper::toDto).toList();
        var enrichedModelDefinitions =
                modelDefinitionsService.enrichAllWithAttachmentSlotsAndWargearOptions(
                        dtos.stream().map(CollectionModel::getModelDefinition).toList());

        for (int i = 0; i < entities.size(); i++) {
            var entity = entities.get(i);
            var dto = dtos.get(i);
            dto.setModelDefinition(enrichedModelDefinitions.get(i));
            dto.setImages(
                    imagesByCollectionModelId.getOrDefault(entity.getId(), List.of()).stream()
                            .map(this::toImageDtoWithUrls)
                            .toList());
            dto.setWargearSelections(
                    wargearSelectionsByCollectionModelId
                            .getOrDefault(entity.getId(), List.of())
                            .stream()
                            .map(collectionModelMapper::toDto)
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
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Model definition not found: " + modelDefinitionId));

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
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Army collection not found: " + armyCollectionId));

        if (!armyCollection.getUserId().equals(userId)) {
            throw new NotFoundException("Army collection not found: " + armyCollectionId);
        }
    }

    private void requireViewableArmyCollection(UUID userId, UUID armyCollectionId) {
        var armyCollection =
                armyCollectionRepository
                        .findById(armyCollectionId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Army collection not found: " + armyCollectionId));

        if (!Boolean.TRUE.equals(armyCollection.getIsPublic())
                && (!armyCollection.getUserId().equals(userId))) {
            throw new NotFoundException("Army collection not found: " + armyCollectionId);
        }
    }
}

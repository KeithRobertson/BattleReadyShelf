package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.CollectionModel;
import com.keith.battlereadyshelf.generated.model.CollectionModelImage;
import com.keith.battlereadyshelf.generated.model.WargearSelection;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionRepository;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionsService;
import com.keith.battlereadyshelf.storage.PresignedUrlService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
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

    public List<CollectionModel> getCollectionModels(UUID userId, UUID armyCollectionId) {
        requireOwnedArmyCollection(userId, armyCollectionId);

        return collectionModelRepository.findAllByArmyCollectionId(armyCollectionId).stream()
                .map(this::toDtoWithImages)
                .toList();
    }

    public CollectionModel createCollectionModel(
            UUID userId, UUID armyCollectionId, CollectionModel collectionModel) {
        requireOwnedArmyCollection(userId, armyCollectionId);

        var modelDefinition =
                modelDefinitionRepository
                        .findById(collectionModel.getModelDefinitionId())
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Model definition not found: "
                                                        + collectionModel.getModelDefinitionId()));

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
            UUID userId, UUID armyCollectionId, UUID modelDefinitionId, int count) {
        requireOwnedArmyCollection(userId, armyCollectionId);

        var modelDefinition =
                modelDefinitionRepository
                        .findById(modelDefinitionId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Model definition not found: "
                                                        + modelDefinitionId));

        var newEntities =
                Stream.generate(
                                () ->
                                        CollectionModelEntity.builder()
                                                .armyCollectionId(armyCollectionId)
                                                .modelDefinition(modelDefinition)
                                                .build())
                        .limit(count)
                        .toList();

        return collectionModelRepository.saveAll(newEntities).stream()
                .map(this::toDtoWithImages)
                .toList();
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
        if (wargearSelections != null) {
            replaceWargearSelections(collectionModelId, wargearSelections);
        }

        return toDtoWithImages(collectionModelRepository.save(collectionModel));
    }

    private void replaceWargearSelections(
            UUID collectionModelId, List<WargearSelection> wargearSelections) {
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
                    deleteVariantIfPresent(image.getOriginal());
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

    private CollectionModel toDtoWithImages(CollectionModelEntity entity) {
        var dto = collectionModelMapper.toDto(entity);
        dto.setModelDefinition(
                modelDefinitionsService.enrichWithAttachmentSlotsAndWargearOptions(
                        dto.getModelDefinition()));
        var images =
                collectionModelImageRepository.findAllByCollectionModelId(entity.getId()).stream()
                        .map(this::toImageDtoWithUrls)
                        .toList();
        dto.setImages(images);
        var wargearSelections =
                collectionModelWargearSelectionRepository
                        .findAllByCollectionModelId(entity.getId())
                        .stream()
                        .map(collectionModelMapper::toDto)
                        .toList();
        dto.setWargearSelections(wargearSelections);
        return dto;
    }

    private CollectionModelImage toImageDtoWithUrls(CollectionModelImageEntity imageEntity) {
        var imageDto = collectionModelImageMapper.toDto(imageEntity);
        var originalUrl = presignDownloadIfPresent(imageEntity.getOriginal());
        imageDto.setOriginalUrl(originalUrl);
        // Fall back to the original rendition for images uploaded before large/thumbnail
        // renditions existed.
        imageDto.setLargeUrl(orElse(presignDownloadIfPresent(imageEntity.getLarge()), originalUrl));
        imageDto.setThumbnailUrl(
                orElse(presignDownloadIfPresent(imageEntity.getThumbnail()), originalUrl));
        return imageDto;
    }

    private URI presignDownloadIfPresent(ImageVariant variant) {
        return variant == null || variant.getStorageKey() == null
                ? null
                : presignedUrlService.presignDownload(variant.getStorageKey());
    }

    private static URI orElse(URI value, URI fallback) {
        return value != null ? value : fallback;
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
}

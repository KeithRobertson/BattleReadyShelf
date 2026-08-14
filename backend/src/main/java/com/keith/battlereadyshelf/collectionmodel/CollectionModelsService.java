package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.CollectionModel;
import com.keith.battlereadyshelf.generated.model.CollectionModelImage;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionRepository;
import com.keith.battlereadyshelf.storage.PresignedUrlService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class CollectionModelsService {
    private final CollectionModelRepository collectionModelRepository;
    private final ArmyCollectionRepository armyCollectionRepository;
    private final ModelDefinitionRepository modelDefinitionRepository;
    private final CollectionModelImageRepository collectionModelImageRepository;
    private final CollectionModelMapper collectionModelMapper;
    private final CollectionModelImageMapper collectionModelImageMapper;
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
     * Creates {@code count} unnamed collection models of the given model definition in one go
     * (e.g. adding 60 Poxwalkers at once) so they can be individually named afterwards.
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
                IntStream.range(0, count)
                        .mapToObj(
                                i ->
                                        CollectionModelEntity.builder()
                                                .armyCollectionId(armyCollectionId)
                                                .modelDefinition(modelDefinition)
                                                .build())
                        .toList();

        return collectionModelRepository.saveAll(newEntities).stream()
                .map(this::toDtoWithImages)
                .toList();
    }

    /** Renames/updates the name and/or description of an existing collection model. */
    public CollectionModel updateCollectionModel(
            UUID userId, UUID collectionModelId, String name, String description) {
        var collectionModel = requireOwnedCollectionModel(userId, collectionModelId);

        if (name != null) {
            collectionModel.setName(name);
        }
        if (description != null) {
            collectionModel.setDescription(description);
        }

        return toDtoWithImages(collectionModelRepository.save(collectionModel));
    }

    /**
     * Deletes a collection model along with its images (both the R2 objects and the DB rows;
     * the DB rows would also cascade-delete on their own, but the R2 objects need explicit
     * cleanup since Postgres cascades don't reach out-of-database storage).
     */
    public void deleteCollectionModel(UUID userId, UUID collectionModelId) {
        var collectionModel = requireOwnedCollectionModel(userId, collectionModelId);
        deleteImagesAndModel(collectionModel);
    }

    /**
     * Deletes multiple collection models (and their images) at once. Ids that don't exist or
     * don't belong to this army collection are silently skipped rather than failing the whole
     * batch.
     */
    public void bulkDeleteCollectionModels(
            UUID userId, UUID armyCollectionId, List<UUID> collectionModelIds) {
        requireOwnedArmyCollection(userId, armyCollectionId);

        collectionModelRepository.findAllById(collectionModelIds.stream().distinct().toList()).stream()
                .filter(model -> model.getArmyCollectionId().equals(armyCollectionId))
                .forEach(this::deleteImagesAndModel);
    }

    private void deleteImagesAndModel(CollectionModelEntity collectionModel) {
        var images = collectionModelImageRepository.findAllByCollectionModelId(collectionModel.getId());
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
        var images =
                collectionModelImageRepository.findAllByCollectionModelId(entity.getId()).stream()
                        .map(this::toImageDtoWithUrls)
                        .toList();
        dto.setImages(images);
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

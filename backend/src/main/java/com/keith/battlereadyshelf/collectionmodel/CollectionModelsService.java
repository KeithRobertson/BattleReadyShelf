package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.CollectionModel;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionRepository;
import com.keith.battlereadyshelf.storage.PresignedUrlService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

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
                        .map(
                                imageEntity -> {
                                    var imageDto = collectionModelImageMapper.toDto(imageEntity);
                                    imageDto.setUrl(
                                            presignedUrlService.presignDownload(
                                                    imageEntity.getStorageKey()));
                                    return imageDto;
                                })
                        .toList();
        dto.setImages(images);
        return dto;
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

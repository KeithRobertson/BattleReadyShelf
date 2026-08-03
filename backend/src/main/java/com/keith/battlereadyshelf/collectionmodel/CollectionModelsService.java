package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.CollectionModel;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionRepository;

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
    private final CollectionModelMapper collectionModelMapper;

    public List<CollectionModel> getCollectionModels(UUID userId, UUID armyCollectionId) {
        requireOwnedArmyCollection(userId, armyCollectionId);

        return collectionModelRepository.findAllByArmyCollectionId(armyCollectionId).stream()
                .map(collectionModelMapper::toDto)
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

        return collectionModelMapper.toDto(savedCollectionModel);
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

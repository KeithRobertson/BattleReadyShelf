package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.generated.api.CollectionModelsApi;
import com.keith.battlereadyshelf.generated.model.BulkCreateCollectionModelsRequest;
import com.keith.battlereadyshelf.generated.model.BulkDeleteCollectionModelsRequest;
import com.keith.battlereadyshelf.generated.model.CollectionModel;
import com.keith.battlereadyshelf.generated.model.UpdateCollectionModelRequest;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CollectionModelsController implements CollectionModelsApi {
    private final CollectionModelsService collectionModelsService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @Override
    public ResponseEntity<List<CollectionModel>> getCollectionModels(UUID armyCollectionId) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        var collectionModels =
                collectionModelsService.getCollectionModels(currentUser.id(), armyCollectionId);
        return ResponseEntity.ok(collectionModels);
    }

    @Override
    public ResponseEntity<CollectionModel> createCollectionModel(
            UUID armyCollectionId, CollectionModel collectionModel) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        var createdCollectionModel =
                collectionModelsService.createCollectionModel(
                        currentUser.id(), armyCollectionId, collectionModel);
        return ResponseEntity.status(201).body(createdCollectionModel);
    }

    @Override
    public ResponseEntity<List<CollectionModel>> bulkCreateCollectionModels(
            UUID armyCollectionId, BulkCreateCollectionModelsRequest bulkCreateCollectionModelsRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        var createdCollectionModels =
                collectionModelsService.bulkCreateCollectionModels(
                        currentUser.id(),
                        armyCollectionId,
                        bulkCreateCollectionModelsRequest.getModelDefinitionId(),
                        bulkCreateCollectionModelsRequest.getCount());
        return ResponseEntity.status(201).body(createdCollectionModels);
    }

    @Override
    public ResponseEntity<CollectionModel> updateCollectionModel(
            UUID collectionModelId, UpdateCollectionModelRequest updateCollectionModelRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        var updatedCollectionModel =
                collectionModelsService.updateCollectionModel(
                        currentUser.id(),
                        collectionModelId,
                        updateCollectionModelRequest.getName(),
                        updateCollectionModelRequest.getDescription(),
                        updateCollectionModelRequest.getFinishedOn());
        return ResponseEntity.ok(updatedCollectionModel);
    }

    @Override
    public ResponseEntity<Void> deleteCollectionModel(UUID collectionModelId) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        collectionModelsService.deleteCollectionModel(currentUser.id(), collectionModelId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> bulkDeleteCollectionModels(
            UUID armyCollectionId, BulkDeleteCollectionModelsRequest bulkDeleteCollectionModelsRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        collectionModelsService.bulkDeleteCollectionModels(
                currentUser.id(),
                armyCollectionId,
                bulkDeleteCollectionModelsRequest.getCollectionModelIds());
        return ResponseEntity.noContent().build();
    }
}

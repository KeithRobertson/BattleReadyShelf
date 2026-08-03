package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.generated.api.CollectionModelsApi;
import com.keith.battlereadyshelf.generated.model.CollectionModel;
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
}

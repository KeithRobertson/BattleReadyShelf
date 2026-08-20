package com.keith.battlereadyshelf.armycollection;

import com.keith.battlereadyshelf.generated.api.ArmyCollectionsApi;
import com.keith.battlereadyshelf.generated.model.ArmyCollection;
import com.keith.battlereadyshelf.generated.model.ReorderArmyCollectionsRequest;
import com.keith.battlereadyshelf.generated.model.ReorderModelDefinitionGroupsRequest;
import com.keith.battlereadyshelf.generated.model.UpdateArmyCollectionRequest;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ArmyCollectionsController implements ArmyCollectionsApi {
    private final ArmyCollectionsService armyCollectionsService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @Override
    public ResponseEntity<List<ArmyCollection>> getArmyCollections() {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        var armyCollections = armyCollectionsService.getAllArmyCollections(currentUser.id());
        return ResponseEntity.ok(armyCollections);
    }

    @Override
    public ResponseEntity<List<ArmyCollection>> getPublicArmyCollections() {
        var publicArmyCollections = armyCollectionsService.getAllPublicArmyCollections();
        return ResponseEntity.ok(publicArmyCollections);
    }

    @Override
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ArmyCollection> createArmyCollection(ArmyCollection armyCollection) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        var createdArmyCollection =
                armyCollectionsService.createArmyCollection(currentUser.id(), armyCollection);
        return ResponseEntity.status(201).body(createdArmyCollection);
    }

    @Override
    public ResponseEntity<ArmyCollection> getArmyCollection(UUID armyCollectionId) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        var armyCollection =
                armyCollectionsService.getArmyCollection(currentUser.id(), armyCollectionId);
        return ResponseEntity.ok(armyCollection);
    }

    @Override
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ArmyCollection> updateArmyCollection(
            UUID armyCollectionId, UpdateArmyCollectionRequest updateArmyCollectionRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        var updatedArmyCollection =
                armyCollectionsService.updateArmyCollection(
                        currentUser.id(),
                        armyCollectionId,
                        updateArmyCollectionRequest.getName(),
                        updateArmyCollectionRequest.getDescription(),
                        updateArmyCollectionRequest.getIsPublic());
        return ResponseEntity.ok(updatedArmyCollection);
    }

    @Override
    public ResponseEntity<List<ArmyCollection>> reorderArmyCollections(
            ReorderArmyCollectionsRequest reorderArmyCollectionsRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        var reorderedArmyCollections =
                armyCollectionsService.reorderArmyCollections(
                        currentUser.id(), reorderArmyCollectionsRequest.getArmyCollectionIds());
        return ResponseEntity.ok(reorderedArmyCollections);
    }

    @Override
    public ResponseEntity<ArmyCollection> reorderModelDefinitionGroups(
            UUID armyCollectionId,
            ReorderModelDefinitionGroupsRequest reorderModelDefinitionGroupsRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        var updatedArmyCollection =
                armyCollectionsService.reorderModelDefinitionGroups(
                        currentUser.id(),
                        armyCollectionId,
                        reorderModelDefinitionGroupsRequest.getModelDefinitionIds());
        return ResponseEntity.ok(updatedArmyCollection);
    }
}


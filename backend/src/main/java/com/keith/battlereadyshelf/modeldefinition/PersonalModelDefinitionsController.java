package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.generated.api.PersonalModelDefinitionsApi;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.UpsertModelDefinitionDraftRequest;
import com.keith.battlereadyshelf.generated.model.WargearDefinition;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * A user's own model definitions. Unlike the admin definition pages this needs no role beyond
 * being signed in - every operation is scoped to the caller's own rows by
 * {@link PersonalModelDefinitionService}, which is where ownership is enforced rather than here.
 */
@RestController
@RequiredArgsConstructor
public class PersonalModelDefinitionsController implements PersonalModelDefinitionsApi {
    private final PersonalModelDefinitionService personalModelDefinitionService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @Override
    public ResponseEntity<List<ModelDefinition>> getMyModelDefinitions() {
        return ResponseEntity.ok(
                personalModelDefinitionService.getMyModelDefinitions(
                        authenticatedUserProvider.getCurrentUser()));
    }

    @Override
    public ResponseEntity<List<ModelDefinition>> getSharedModelDefinitions() {
        return ResponseEntity.ok(personalModelDefinitionService.getSharedModelDefinitions());
    }

    @Override
    public ResponseEntity<List<WargearDefinition>> getAvailableWargearDefinitions() {
        return ResponseEntity.ok(
                personalModelDefinitionService.getAvailableWargearDefinitions(
                        authenticatedUserProvider.getCurrentUser()));
    }

    @Override
    public ResponseEntity<ModelDefinition> createMyModelDefinition(
            UpsertModelDefinitionDraftRequest upsertModelDefinitionDraftRequest) {
        var created =
                personalModelDefinitionService.createMyModelDefinition(
                        authenticatedUserProvider.getCurrentUser(), upsertModelDefinitionDraftRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Override
    public ResponseEntity<ModelDefinition> updateMyModelDefinition(
            UUID modelDefinitionId, UpsertModelDefinitionDraftRequest upsertModelDefinitionDraftRequest) {
        return ResponseEntity.ok(
                personalModelDefinitionService.updateMyModelDefinition(
                        authenticatedUserProvider.getCurrentUser(),
                        modelDefinitionId,
                        upsertModelDefinitionDraftRequest));
    }

    @Override
    public ResponseEntity<Void> deleteMyModelDefinition(UUID modelDefinitionId) {
        personalModelDefinitionService.deleteMyModelDefinition(
                authenticatedUserProvider.getCurrentUser(), modelDefinitionId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<ModelDefinition> customiseModelDefinition(UUID modelDefinitionId) {
        return ResponseEntity.ok(
                personalModelDefinitionService.customiseModelDefinition(
                        authenticatedUserProvider.getCurrentUser(), modelDefinitionId));
    }
}

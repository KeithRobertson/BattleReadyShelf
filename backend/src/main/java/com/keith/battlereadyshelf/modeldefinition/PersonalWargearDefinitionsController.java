package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.generated.api.PersonalWargearDefinitionsApi;
import com.keith.battlereadyshelf.generated.model.UpdateWargearDefinitionRequest;
import com.keith.battlereadyshelf.generated.model.WargearDefinition;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * A user's own wargear. Unlike the admin wargear page this needs no role beyond being signed in -
 * every operation is scoped to the caller's own rows by {@link PersonalWargearDefinitionService},
 * which is where ownership is enforced rather than here.
 */
@RestController
@RequiredArgsConstructor
public class PersonalWargearDefinitionsController implements PersonalWargearDefinitionsApi {

    private final PersonalWargearDefinitionService personalWargearDefinitionService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @Override
    public ResponseEntity<List<WargearDefinition>> getMyWargearDefinitions() {
        return ResponseEntity.ok(
                personalWargearDefinitionService.getMyWargearDefinitions(
                        authenticatedUserProvider.getCurrentUser()));
    }

    @Override
    public ResponseEntity<List<WargearDefinition>> getSharedWargearDefinitions() {
        return ResponseEntity.ok(personalWargearDefinitionService.getSharedWargearDefinitions());
    }

    @Override
    public ResponseEntity<WargearDefinition> createMyWargearDefinition(
            UpdateWargearDefinitionRequest updateWargearDefinitionRequest) {
        var created =
                personalWargearDefinitionService.createMyWargearDefinition(
                        authenticatedUserProvider.getCurrentUser(), updateWargearDefinitionRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Override
    public ResponseEntity<WargearDefinition> updateMyWargearDefinition(
            UUID wargearDefinitionId, UpdateWargearDefinitionRequest updateWargearDefinitionRequest) {
        return ResponseEntity.ok(
                personalWargearDefinitionService.updateMyWargearDefinition(
                        authenticatedUserProvider.getCurrentUser(),
                        wargearDefinitionId,
                        updateWargearDefinitionRequest));
    }

    @Override
    public ResponseEntity<Void> deleteMyWargearDefinition(UUID wargearDefinitionId) {
        personalWargearDefinitionService.deleteMyWargearDefinition(
                authenticatedUserProvider.getCurrentUser(), wargearDefinitionId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<WargearDefinition> customiseWargearDefinition(UUID wargearDefinitionId) {
        return ResponseEntity.ok(
                personalWargearDefinitionService.customiseWargearDefinition(
                        authenticatedUserProvider.getCurrentUser(), wargearDefinitionId));
    }
}

package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.generated.api.ModelDefinitionAdminApi;
import com.keith.battlereadyshelf.generated.model.Faction;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionDraft;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExport;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionPublishAuditEntry;
import com.keith.battlereadyshelf.generated.model.PublishModelDefinitionDraftRequest;
import com.keith.battlereadyshelf.generated.model.UpsertModelDefinitionDraftRequest;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ModelDefinitionAdminController implements ModelDefinitionAdminApi {
    private final AuthenticatedUserProvider authenticatedUserProvider;
    private final ModelDefinitionDraftService modelDefinitionDraftService;
    private final ModelDefinitionsService modelDefinitionsService;

    @Override
    public ResponseEntity<Void> deleteModelDefinition(UUID modelDefinitionId) {
        modelDefinitionsService.deleteModelDefinition(modelDefinitionId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<ModelDefinitionDraft>> getModelDefinitionDrafts() {
        return ResponseEntity.ok(modelDefinitionDraftService.getAllDrafts());
    }

    @Override
    public ResponseEntity<ModelDefinitionDraft> getModelDefinitionDraft(UUID draftId) {
        return ResponseEntity.ok(modelDefinitionDraftService.getDraft(draftId));
    }

    @Override
    public ResponseEntity<ModelDefinitionDraft> createModelDefinitionDraft(
            UpsertModelDefinitionDraftRequest upsertModelDefinitionDraftRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        modelDefinitionDraftService.createDraft(
                                currentUser, upsertModelDefinitionDraftRequest));
    }

    @Override
    public ResponseEntity<ModelDefinitionDraft> startModelDefinitionDraft(UUID modelDefinitionId) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        return ResponseEntity.ok(modelDefinitionDraftService.startDraft(currentUser, modelDefinitionId));
    }

    @Override
    public ResponseEntity<ModelDefinitionDraft> updateModelDefinitionDraft(
            UUID draftId, UpsertModelDefinitionDraftRequest upsertModelDefinitionDraftRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        return ResponseEntity.ok(
                modelDefinitionDraftService.updateDraft(
                        currentUser, draftId, upsertModelDefinitionDraftRequest));
    }

    @Override
    public ResponseEntity<Void> discardModelDefinitionDraft(UUID draftId) {
        modelDefinitionDraftService.discardDraft(draftId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<ModelDefinition> publishModelDefinitionDraft(
            UUID draftId, PublishModelDefinitionDraftRequest publishModelDefinitionDraftRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        var changeSummary =
                publishModelDefinitionDraftRequest != null
                        ? publishModelDefinitionDraftRequest.getChangeSummary()
                        : null;
        return ResponseEntity.ok(
                modelDefinitionDraftService.publishDraft(currentUser, draftId, changeSummary));
    }

    @Override
    public ResponseEntity<List<ModelDefinitionPublishAuditEntry>> getModelDefinitionPublishHistory(
            UUID modelDefinitionId) {
        return ResponseEntity.ok(modelDefinitionDraftService.getPublishHistory(modelDefinitionId));
    }

    @Override
    public ResponseEntity<ModelDefinitionExport> exportModelDefinitions() {
        return ResponseEntity.ok(modelDefinitionDraftService.exportModelDefinitions());
    }

    @Override
    public ResponseEntity<List<ModelDefinitionDraft>> importModelDefinitions(
            ModelDefinitionExport modelDefinitionExport) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        return ResponseEntity.ok(
                modelDefinitionDraftService.importModelDefinitions(currentUser, modelDefinitionExport));
    }
}

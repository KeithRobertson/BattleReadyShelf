package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.generated.api.WargearDefinitionAdminApi;
import com.keith.battlereadyshelf.generated.model.DefinitionPublishAudit;
import com.keith.battlereadyshelf.generated.model.UpdateWargearDefinitionRequest;
import com.keith.battlereadyshelf.generated.model.WargearDefinition;
import com.keith.battlereadyshelf.generated.model.WargearDefinitionDraft;
import com.keith.battlereadyshelf.generated.model.WargearDefinitionExport;
import com.keith.battlereadyshelf.generated.model.WargearImportResult;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class WargearDefinitionAdminController implements WargearDefinitionAdminApi {
    private final AuthenticatedUserProvider authenticatedUserProvider;
    private final WargearDefinitionService wargearDefinitionService;

    @Override
    public ResponseEntity<List<WargearDefinition>> getWargearDefinitions() {
        return ResponseEntity.ok(wargearDefinitionService.getAllWargearDefinitions());
    }

    /** 204 means the proposal matched the stored name, so there was nothing to stage. */
    @Override
    public ResponseEntity<WargearDefinitionDraft> updateWargearDefinition(
            UUID wargearDefinitionId, UpdateWargearDefinitionRequest updateWargearDefinitionRequest) {
        var staged =
                wargearDefinitionService.proposeWargearDefinitionRename(
                        wargearDefinitionId, updateWargearDefinitionRequest.getName());
        return staged == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(staged);
    }

    @Override
    public ResponseEntity<List<WargearDefinitionDraft>> getWargearDefinitionDrafts() {
        return ResponseEntity.ok(wargearDefinitionService.getAllWargearDefinitionDrafts());
    }

    @Override
    public ResponseEntity<WargearDefinition> publishWargearDefinitionDraft(UUID draftId) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        return ResponseEntity.ok(
                wargearDefinitionService.publishWargearDefinitionDraft(currentUser, draftId));
    }

    @Override
    public ResponseEntity<Void> discardWargearDefinitionDraft(UUID draftId) {
        wargearDefinitionService.discardWargearDefinitionDraft(draftId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<DefinitionPublishAudit>> getWargearPublishHistory(
            UUID wargearDefinitionId) {
        return ResponseEntity.ok(wargearDefinitionService.getPublishHistory(wargearDefinitionId));
    }

    @Override
    public ResponseEntity<WargearDefinitionExport> exportWargearDefinitions() {
        return ResponseEntity.ok(wargearDefinitionService.exportWargearDefinitions());
    }

    @Override
    public ResponseEntity<WargearImportResult> importWargearDefinitions(
            WargearDefinitionExport wargearDefinitionExport) {
        return ResponseEntity.ok(
                wargearDefinitionService.importWargearDefinitions(wargearDefinitionExport));
    }
}

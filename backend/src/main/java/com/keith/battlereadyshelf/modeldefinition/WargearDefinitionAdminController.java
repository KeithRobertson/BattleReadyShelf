package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.generated.api.WargearDefinitionAdminApi;
import com.keith.battlereadyshelf.generated.model.UpdateWargearDefinitionRequest;
import com.keith.battlereadyshelf.generated.model.WargearDefinition;
import com.keith.battlereadyshelf.generated.model.WargearDefinitionDraft;
import com.keith.battlereadyshelf.generated.model.WargearDefinitionExport;
import com.keith.battlereadyshelf.generated.model.WargearImportResult;

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
    private final WargearDefinitionService wargearDefinitionService;

    @Override
    public ResponseEntity<List<WargearDefinition>> getWargearDefinitions() {
        return ResponseEntity.ok(wargearDefinitionService.getAllWargearDefinitions());
    }

    @Override
    public ResponseEntity<WargearDefinition> updateWargearDefinition(
            UUID wargearDefinitionId, UpdateWargearDefinitionRequest updateWargearDefinitionRequest) {
        return ResponseEntity.ok(
                wargearDefinitionService.renameWargearDefinition(
                        wargearDefinitionId, updateWargearDefinitionRequest.getName()));
    }

    @Override
    public ResponseEntity<List<WargearDefinitionDraft>> getWargearDefinitionDrafts() {
        return ResponseEntity.ok(wargearDefinitionService.getAllWargearDefinitionDrafts());
    }

    @Override
    public ResponseEntity<WargearDefinition> publishWargearDefinitionDraft(UUID draftId) {
        return ResponseEntity.ok(wargearDefinitionService.publishWargearDefinitionDraft(draftId));
    }

    @Override
    public ResponseEntity<Void> discardWargearDefinitionDraft(UUID draftId) {
        wargearDefinitionService.discardWargearDefinitionDraft(draftId);
        return ResponseEntity.noContent().build();
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

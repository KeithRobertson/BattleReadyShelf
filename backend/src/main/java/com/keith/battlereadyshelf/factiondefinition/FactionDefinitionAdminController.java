package com.keith.battlereadyshelf.factiondefinition;

import com.keith.battlereadyshelf.generated.api.FactionDefinitionAdminApi;
import com.keith.battlereadyshelf.generated.model.DefinitionPublishAudit;
import com.keith.battlereadyshelf.generated.model.Faction;
import com.keith.battlereadyshelf.generated.model.FactionDraft;
import com.keith.battlereadyshelf.generated.model.FactionExport;
import com.keith.battlereadyshelf.generated.model.FactionImportResult;
import com.keith.battlereadyshelf.generated.model.UpdateFactionRequest;
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
public class FactionDefinitionAdminController implements FactionDefinitionAdminApi {
    private final AuthenticatedUserProvider authenticatedUserProvider;
    private final FactionDefinitionService factionDefinitionService;

    @Override
    public ResponseEntity<List<Faction>> getFactions() {
        return ResponseEntity.ok(factionDefinitionService.getSharedFactions());
    }

    @Override
    public ResponseEntity<Faction> createFaction(Faction faction) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(factionDefinitionService.createFaction(faction));
    }

    /** 204 means the proposal matched the stored state, so there was nothing to stage. */
    @Override
    public ResponseEntity<FactionDraft> proposeFactionChange(
            UUID factionId, UpdateFactionRequest updateFactionRequest) {
        var staged = factionDefinitionService.proposeFactionChange(factionId, updateFactionRequest);
        return staged == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(staged);
    }

    @Override
    public ResponseEntity<Void> deleteFaction(UUID factionId) {
        factionDefinitionService.deleteFaction(factionId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<FactionDraft>> getFactionDrafts() {
        return ResponseEntity.ok(factionDefinitionService.getAllFactionDrafts());
    }

    @Override
    public ResponseEntity<Faction> publishFactionDraft(UUID draftId) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        return ResponseEntity.ok(factionDefinitionService.publishFactionDraft(currentUser, draftId));
    }

    @Override
    public ResponseEntity<Void> discardFactionDraft(UUID draftId) {
        factionDefinitionService.discardFactionDraft(draftId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<DefinitionPublishAudit>> getFactionPublishHistory(UUID factionId) {
        return ResponseEntity.ok(factionDefinitionService.getPublishHistory(factionId));
    }

    @Override
    public ResponseEntity<FactionExport> exportFactions() {
        return ResponseEntity.ok(factionDefinitionService.exportFactions());
    }

    @Override
    public ResponseEntity<FactionImportResult> importFactions(FactionExport factionExport) {
        return ResponseEntity.ok(factionDefinitionService.importFactions(factionExport));
    }
}

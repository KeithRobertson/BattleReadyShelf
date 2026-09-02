package com.keith.battlereadyshelf.paint;

import com.keith.battlereadyshelf.generated.api.PaintAdminApi;
import com.keith.battlereadyshelf.generated.model.DefinitionPublishAudit;
import com.keith.battlereadyshelf.generated.model.Paint;
import com.keith.battlereadyshelf.generated.model.PaintDraft;
import com.keith.battlereadyshelf.generated.model.PaintExport;
import com.keith.battlereadyshelf.generated.model.PaintImportResult;
import com.keith.battlereadyshelf.generated.model.UpdatePaintRequest;
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
public class PaintAdminController implements PaintAdminApi {

    private final PaintService paintService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    /**
     * The shared catalogue only. Personal paints are deliberately excluded: they belong to
     * individual users, so listing them here would both leak them and fill the admin page with rows
     * no admin can act on.
     */
    @Override
    public ResponseEntity<List<Paint>> getAdminPaints() {
        return ResponseEntity.ok(paintService.getSharedPaints());
    }

    @Override
    public ResponseEntity<Paint> createPaint(UpdatePaintRequest updatePaintRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paintService.createPaint(updatePaintRequest));
    }

    /** 204 means the proposal matched the stored state, so there was nothing to stage. */
    @Override
    public ResponseEntity<PaintDraft> proposePaintChange(
            UUID paintId, UpdatePaintRequest updatePaintRequest) {
        var staged = paintService.proposePaintChange(paintId, updatePaintRequest);
        return staged == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(staged);
    }

    @Override
    public ResponseEntity<Void> deletePaint(UUID paintId) {
        paintService.deletePaint(paintId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<PaintDraft>> getPaintDrafts() {
        return ResponseEntity.ok(paintService.getAllPaintDrafts());
    }

    @Override
    public ResponseEntity<Paint> publishPaintDraft(UUID draftId) {
        return ResponseEntity.ok(
                paintService.publishPaintDraft(authenticatedUserProvider.getCurrentUser(), draftId));
    }

    @Override
    public ResponseEntity<Void> discardPaintDraft(UUID draftId) {
        paintService.discardPaintDraft(draftId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<DefinitionPublishAudit>> getPaintPublishHistory(UUID paintId) {
        return ResponseEntity.ok(paintService.getPublishHistory(paintId));
    }

    @Override
    public ResponseEntity<PaintExport> exportPaints() {
        return ResponseEntity.ok(paintService.exportPaints());
    }

    @Override
    public ResponseEntity<PaintImportResult> importPaints(PaintExport paintExport) {
        return ResponseEntity.ok(paintService.importPaints(paintExport));
    }
}

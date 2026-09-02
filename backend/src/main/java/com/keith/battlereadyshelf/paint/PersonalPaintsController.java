package com.keith.battlereadyshelf.paint;

import com.keith.battlereadyshelf.generated.api.PersonalPaintsApi;
import com.keith.battlereadyshelf.generated.model.Paint;
import com.keith.battlereadyshelf.generated.model.UpdatePaintRequest;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * A user's own paints. Needs no role beyond being signed in - every operation is scoped to the
 * caller's own rows by {@link PersonalPaintService}, which is where ownership is enforced rather
 * than here.
 */
@RestController
@RequiredArgsConstructor
public class PersonalPaintsController implements PersonalPaintsApi {

    private final PersonalPaintService personalPaintService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @Override
    public ResponseEntity<List<Paint>> getMyPaints() {
        return ResponseEntity.ok(
                personalPaintService.getMyPaints(authenticatedUserProvider.getCurrentUser()));
    }

    @Override
    public ResponseEntity<List<Paint>> getSharedPaints() {
        return ResponseEntity.ok(personalPaintService.getSharedPaints());
    }

    @Override
    public ResponseEntity<Paint> createMyPaint(UpdatePaintRequest updatePaintRequest) {
        var created =
                personalPaintService.createMyPaint(
                        authenticatedUserProvider.getCurrentUser(), updatePaintRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Override
    public ResponseEntity<Paint> updateMyPaint(
            UUID paintId, UpdatePaintRequest updatePaintRequest) {
        return ResponseEntity.ok(
                personalPaintService.updateMyPaint(
                        authenticatedUserProvider.getCurrentUser(), paintId, updatePaintRequest));
    }

    @Override
    public ResponseEntity<Void> deleteMyPaint(UUID paintId) {
        personalPaintService.deleteMyPaint(authenticatedUserProvider.getCurrentUser(), paintId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Paint> customisePaint(UUID paintId) {
        return ResponseEntity.ok(
                personalPaintService.customisePaint(
                        authenticatedUserProvider.getCurrentUser(), paintId));
    }
}

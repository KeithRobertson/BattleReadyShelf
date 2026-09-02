package com.keith.battlereadyshelf.paint;

import com.keith.battlereadyshelf.generated.api.PaintsApi;
import com.keith.battlereadyshelf.generated.model.Paint;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The paints available to whoever is asking. Open to anonymous callers, who get the shared
 * catalogue alone, so the recipes on a public collection can be read without signing in.
 */
@RestController
@RequiredArgsConstructor
public class PaintsController implements PaintsApi {

    private final PersonalPaintService personalPaintService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @Override
    public ResponseEntity<List<Paint>> getPaints() {
        var currentUserId =
                authenticatedUserProvider
                        .findCurrentUser()
                        .map(CurrentAuthenticatedUser::id)
                        .orElse(null);
        return ResponseEntity.ok(personalPaintService.getVisiblePaints(currentUserId));
    }
}

package com.keith.battlereadyshelf.factiondefinition;

import com.keith.battlereadyshelf.generated.api.PersonalFactionsApi;
import com.keith.battlereadyshelf.generated.model.Faction;
import com.keith.battlereadyshelf.generated.model.UpdateFactionRequest;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * A user's own factions. Unlike the admin faction page this needs no role beyond being signed in -
 * every operation is scoped to the caller's own rows by {@link PersonalFactionService}, which is
 * where ownership is enforced rather than here.
 */
@RestController
@RequiredArgsConstructor
public class PersonalFactionsController implements PersonalFactionsApi {

    private final PersonalFactionService personalFactionService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @Override
    public ResponseEntity<List<Faction>> getMyFactions() {
        return ResponseEntity.ok(
                personalFactionService.getMyFactions(authenticatedUserProvider.getCurrentUser()));
    }

    @Override
    public ResponseEntity<List<Faction>> getSharedFactions() {
        return ResponseEntity.ok(personalFactionService.getSharedFactions());
    }

    @Override
    public ResponseEntity<Faction> createMyFaction(UpdateFactionRequest updateFactionRequest) {
        var created =
                personalFactionService.createMyFaction(
                        authenticatedUserProvider.getCurrentUser(), updateFactionRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Override
    public ResponseEntity<Faction> updateMyFaction(
            UUID factionId, UpdateFactionRequest updateFactionRequest) {
        return ResponseEntity.ok(
                personalFactionService.updateMyFaction(
                        authenticatedUserProvider.getCurrentUser(), factionId, updateFactionRequest));
    }

    @Override
    public ResponseEntity<Void> deleteMyFaction(UUID factionId) {
        personalFactionService.deleteMyFaction(authenticatedUserProvider.getCurrentUser(), factionId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Faction> customiseFaction(UUID factionId) {
        return ResponseEntity.ok(
                personalFactionService.customiseFaction(
                        authenticatedUserProvider.getCurrentUser(), factionId));
    }
}

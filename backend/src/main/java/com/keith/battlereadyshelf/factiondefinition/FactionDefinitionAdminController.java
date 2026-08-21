package com.keith.battlereadyshelf.factiondefinition;

import com.keith.battlereadyshelf.generated.api.FactionDefinitionAdminApi;
import com.keith.battlereadyshelf.generated.model.Faction;

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
    private final FactionDefinitionService factionDefinitionService;

    @Override
    public ResponseEntity<List<Faction>> getFactions() {
        return ResponseEntity.ok(factionDefinitionService.getAllFactions());
    }

    @Override
    public ResponseEntity<Faction> createFaction(Faction faction) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(factionDefinitionService.createFaction(faction));
    }

    @Override
    public ResponseEntity<Void> deleteFaction(UUID factionId) {
        factionDefinitionService.deleteFaction(factionId);
        return ResponseEntity.noContent().build();
    }
}

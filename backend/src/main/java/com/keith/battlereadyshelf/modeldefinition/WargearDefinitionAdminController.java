package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.generated.api.WargearDefinitionAdminApi;
import com.keith.battlereadyshelf.generated.model.UpdateWargearDefinitionRequest;
import com.keith.battlereadyshelf.generated.model.WargearDefinition;

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
}

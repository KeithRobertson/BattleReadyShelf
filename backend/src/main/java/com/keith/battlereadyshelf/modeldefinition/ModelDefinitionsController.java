package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.factiondefinition.FactionDefinitionService;
import com.keith.battlereadyshelf.generated.api.ModelDefinitionsApi;
import com.keith.battlereadyshelf.generated.model.Faction;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ModelDefinitionsController implements ModelDefinitionsApi {
    private final ModelDefinitionsService modelDefinitionsService;
    private final FactionDefinitionService factionDefinitionService;

    @Override
    public ResponseEntity<List<ModelDefinition>> getModelDefinitions() {
        return ResponseEntity.ok(modelDefinitionsService.getAllModelDefinitions());
    }

    @Override
    public ResponseEntity<List<Faction>> getFactionsList() {
        return ResponseEntity.ok(factionDefinitionService.getAllFactions());
    }
}

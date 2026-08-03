package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.generated.api.ModelDefinitionsApi;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ModelDefinitionsController implements ModelDefinitionsApi {
    private final ModelDefinitionsService modelDefinitionsService;

    @Override
    public ResponseEntity<List<ModelDefinition>> getModelDefinitions() {
        return ResponseEntity.ok(modelDefinitionsService.getAllModelDefinitions());
    }
}

package com.keith.battlereadyshelf.armycollection;

import com.keith.battlereadyshelf.generated.api.ArmyCollectionsApi;
import com.keith.battlereadyshelf.generated.model.ArmyCollection;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ArmyCollectionsController implements ArmyCollectionsApi {
    private final ArmyCollectionsService armyCollectionsService;

    @Override
    public ResponseEntity<List<ArmyCollection>> getArmyCollections() {
        var armyCollections = armyCollectionsService.getAllArmyCollections();
        return ResponseEntity.ok(armyCollections);
    }

    @Override
    public ResponseEntity<ArmyCollection> createArmyCollection(ArmyCollection armyCollection) {
        var createdArmyCollection = armyCollectionsService.createArmyCollection(armyCollection);
        return ResponseEntity.status(201).body(createdArmyCollection);
    }
}

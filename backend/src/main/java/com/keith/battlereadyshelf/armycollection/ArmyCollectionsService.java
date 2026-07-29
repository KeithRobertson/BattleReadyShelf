package com.keith.battlereadyshelf.armycollection;

import com.keith.battlereadyshelf.generated.model.ArmyCollection;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ArmyCollectionsService {
    public List<ArmyCollection> getAllArmyCollections() {
        return List.of(
                new ArmyCollection("Starter Collection")
                        .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                        .description("A static example collection"));
    }

    public ArmyCollection createArmyCollection(ArmyCollection armyCollection) {
        return new ArmyCollection(armyCollection.getName())
                .id(UUID.randomUUID())
                .description(armyCollection.getDescription());
    }
}

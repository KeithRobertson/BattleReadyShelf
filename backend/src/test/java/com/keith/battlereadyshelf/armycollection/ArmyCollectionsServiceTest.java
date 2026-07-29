package com.keith.battlereadyshelf.armycollection;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;

import com.keith.battlereadyshelf.generated.model.ArmyCollection;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

class ArmyCollectionsServiceTest {
    private ArmyCollectionsService armyCollectionsService;

    @BeforeEach
    void setUp() {
        armyCollectionsService = new ArmyCollectionsService();
    }

    @Test
    void getAllArmyCollections_returnsStaticArmyCollections() {
        var armyCollections = armyCollectionsService.getAllArmyCollections();

        assertThat(armyCollections)
                .containsExactly(
                        new ArmyCollection("Starter Collection")
                                .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                                .description("A static example collection"));
    }

    @Test
    void createArmyCollection_returnsArmyCollectionThatWasPassedInWithRandomUUID() {
        var createdArmyCollection =
                armyCollectionsService.createArmyCollection(
                        new ArmyCollection("Test Collection").description("Test Description"));

        assertThat(createdArmyCollection.getId()).isNotNull();
        assertThat(createdArmyCollection)
                .usingRecursiveComparison()
                .ignoringFields("id")
                .isEqualTo(new ArmyCollection("Test Collection").description("Test Description"));
    }
}

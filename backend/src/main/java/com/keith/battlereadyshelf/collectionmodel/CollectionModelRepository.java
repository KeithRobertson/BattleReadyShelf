package com.keith.battlereadyshelf.collectionmodel;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CollectionModelRepository extends JpaRepository<CollectionModelEntity, UUID> {
    List<CollectionModelEntity> findAllByArmyCollectionId(UUID armyCollectionId);
}

package com.keith.battlereadyshelf.collectionmodel;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CollectionModelWargearSelectionRepository
        extends JpaRepository<CollectionModelWargearSelectionEntity, UUID> {
    List<CollectionModelWargearSelectionEntity> findAllByCollectionModelId(UUID collectionModelId);

    void deleteAllByCollectionModelId(UUID collectionModelId);
}

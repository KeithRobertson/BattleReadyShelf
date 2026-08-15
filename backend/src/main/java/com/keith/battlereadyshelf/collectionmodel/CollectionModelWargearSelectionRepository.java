package com.keith.battlereadyshelf.collectionmodel;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CollectionModelWargearSelectionRepository
        extends JpaRepository<CollectionModelWargearSelectionEntity, UUID> {
    List<CollectionModelWargearSelectionEntity> findAllByCollectionModelId(UUID collectionModelId);

    List<CollectionModelWargearSelectionEntity> findAllByCollectionModelIdIn(
            List<UUID> collectionModelIds);

    void deleteAllByCollectionModelId(UUID collectionModelId);
}

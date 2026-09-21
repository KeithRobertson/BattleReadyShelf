package com.keith.battlereadyshelf.collectionmodel;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface CollectionModelMagnetizedSlotRepository
        extends JpaRepository<CollectionModelMagnetizedSlotEntity, UUID> {
    List<CollectionModelMagnetizedSlotEntity> findAllByCollectionModelIdIn(Collection<UUID> collectionModelIds);

    void deleteAllByCollectionModelId(UUID collectionModelId);
}

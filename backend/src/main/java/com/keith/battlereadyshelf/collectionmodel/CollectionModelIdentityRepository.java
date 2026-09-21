package com.keith.battlereadyshelf.collectionmodel;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface CollectionModelIdentityRepository
        extends JpaRepository<CollectionModelIdentityEntity, UUID> {
    List<CollectionModelIdentityEntity> findAllByCollectionModelId(UUID collectionModelId);

    List<CollectionModelIdentityEntity> findAllByCollectionModelIdIn(Collection<UUID> collectionModelIds);

    void deleteAllByCollectionModelId(UUID collectionModelId);
}

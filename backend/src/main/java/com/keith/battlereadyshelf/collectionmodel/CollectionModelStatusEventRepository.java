package com.keith.battlereadyshelf.collectionmodel;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CollectionModelStatusEventRepository
        extends JpaRepository<CollectionModelStatusEventEntity, UUID> {
    List<CollectionModelStatusEventEntity> findAllByCollectionModelIdIn(List<UUID> collectionModelIds);
}

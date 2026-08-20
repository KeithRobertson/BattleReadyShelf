package com.keith.battlereadyshelf.armycollection;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ArmyCollectionRepository extends JpaRepository<ArmyCollectionEntity, UUID> {
    List<ArmyCollectionEntity> findAllByUserIdOrderByDisplayOrderAsc(UUID userId);

    List<ArmyCollectionEntity> findAllByIsPublicTrueOrderByNameAsc();
}

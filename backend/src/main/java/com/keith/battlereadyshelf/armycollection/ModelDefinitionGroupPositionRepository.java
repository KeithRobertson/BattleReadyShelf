package com.keith.battlereadyshelf.armycollection;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ModelDefinitionGroupPositionRepository
        extends JpaRepository<ModelDefinitionGroupPositionEntity, UUID> {
    List<ModelDefinitionGroupPositionEntity> findByArmyCollectionIdOrderByDisplayOrderAsc(
            UUID armyCollectionId);

    /**
     * Issues an immediate bulk DELETE (rather than a derived find-then-remove) so it's guaranteed to
     * execute before any subsequent inserts in the same transaction/flush - avoiding unique
     * constraint violations when replacing a collection's group order.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            "delete from ModelDefinitionGroupPositionEntity p where p.armyCollectionId ="
                    + " :armyCollectionId")
    void deleteByArmyCollectionId(@Param("armyCollectionId") UUID armyCollectionId);
}

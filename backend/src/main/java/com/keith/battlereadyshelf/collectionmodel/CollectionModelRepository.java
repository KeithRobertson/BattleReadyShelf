package com.keith.battlereadyshelf.collectionmodel;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CollectionModelRepository extends JpaRepository<CollectionModelEntity, UUID> {
    @EntityGraph(attributePaths = "modelDefinition")
    List<CollectionModelEntity> findAllByArmyCollectionId(UUID armyCollectionId);

    long countByModelDefinitionId(UUID modelDefinitionId);

    /**
     * Whether a collection contains any model of one type. Used to reject a paint recipe scoped to a
     * type the collection does not have, which could never be displayed.
     */
    boolean existsByArmyCollectionIdAndModelDefinitionId(
            UUID armyCollectionId, UUID modelDefinitionId);

    @Query(
            "select c.armyCollectionId as armyCollectionId, c.status as status, count(c) as count "
                    + "from CollectionModelEntity c "
                    + "where c.armyCollectionId in :armyCollectionIds "
                    + "group by c.armyCollectionId, c.status")
    List<ArmyCollectionStatusCount> countByArmyCollectionIdInGroupByStatus(
            @Param("armyCollectionIds") List<UUID> armyCollectionIds);

    /** Projection of the number of collection models with a given status, within an army collection. */
    interface ArmyCollectionStatusCount {
        UUID getArmyCollectionId();

        CollectionModelStatus getStatus();

        long getCount();
    }
}

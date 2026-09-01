package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ModelDefinitionRepository extends JpaRepository<ModelDefinitionEntity, UUID> {

    /** How many model definitions sit under each faction, in one query. */
    @Query(
            "select m.factionId, count(m) from ModelDefinitionEntity m"
                    + " where m.factionId is not null group by m.factionId")
    List<Object[]> countByFaction();
}

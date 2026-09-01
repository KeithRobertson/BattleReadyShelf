package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface WargearOptionRepository extends JpaRepository<WargearOptionEntity, UUID> {
    List<WargearOptionEntity> findAllByModelDefinitionIdIn(List<UUID> modelDefinitionIds);

    long countByWargearDefinitionId(UUID wargearDefinitionId);

    /** How many model definitions reference each wargear definition, in one query. */
    @Query(
            "select o.wargearDefinition.id, count(o) from WargearOptionEntity o"
                    + " group by o.wargearDefinition.id")
    List<Object[]> countUsagesByWargearDefinition();
}

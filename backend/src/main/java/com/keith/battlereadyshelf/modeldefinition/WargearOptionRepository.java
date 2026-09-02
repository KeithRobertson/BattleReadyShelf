package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface WargearOptionRepository extends JpaRepository<WargearOptionEntity, UUID> {
    /**
     * Options with their wargear definition and filled slots already loaded.
     *
     * <p>Both associations are read for essentially every option that is mapped to a DTO, so
     * without the fetch joins each option costs two further queries: one for its eagerly-mapped
     * definition and one for its lazy slot collection. Listing the ~180-definition catalogue that
     * way ran to roughly 1,700 statements, which is unremarkable against a local database and
     * pathological against a hosted one.
     *
     * <p>{@code distinct} is required because joining the slot collection repeats an option once
     * per slot it fills.
     */
    @Query(
            "select distinct o from WargearOptionEntity o"
                    + " join fetch o.wargearDefinition"
                    + " left join fetch o.attachmentSlots"
                    + " where o.modelDefinitionId in :modelDefinitionIds")
    List<WargearOptionEntity> findAllByModelDefinitionIdIn(List<UUID> modelDefinitionIds);

    long countByWargearDefinitionId(UUID wargearDefinitionId);

    /** How many model definitions reference each wargear definition, in one query. */
    @Query(
            "select o.wargearDefinition.id, count(o) from WargearOptionEntity o"
                    + " group by o.wargearDefinition.id")
    List<Object[]> countUsagesByWargearDefinition();
}

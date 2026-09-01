package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ModelDefinitionRepository extends JpaRepository<ModelDefinitionEntity, UUID> {

    /**
     * How many model definitions sit under each faction, in one query. Personal definitions are
     * excluded so the admin faction list reports the size of the shared catalogue rather than a
     * number that shifts whenever a user customises something.
     */
    @Query(
            "select m.factionId, count(m) from ModelDefinitionEntity m"
                    + " where m.factionId is not null and m.ownerUserId is null"
                    + " group by m.factionId")
    List<Object[]> countByFaction();

    /** The shared catalogue: everything the admin pages, the importer and the exporter act on. */
    List<ModelDefinitionEntity> findAllByOwnerUserIdIsNull();

    List<ModelDefinitionEntity> findAllByOwnerUserId(UUID ownerUserId);

    Optional<ModelDefinitionEntity> findByIdAndOwnerUserId(UUID id, UUID ownerUserId);

    Optional<ModelDefinitionEntity> findByOwnerUserIdAndBaseModelDefinitionId(
            UUID ownerUserId, UUID baseModelDefinitionId);
}

package com.keith.battlereadyshelf.factiondefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FactionRepository extends JpaRepository<FactionEntity, UUID> {
    Optional<FactionEntity> findByExternalId(String externalId);

    List<FactionEntity> findAllByExternalIdIn(List<String> externalIds);

    /**
     * The shared catalogue: everything the admin pages, the importer, the exporter and the
     * draft/publish workflow act on. Personal factions are ordinary rows in the same table, so
     * every one of those callers has to say so explicitly.
     */
    List<FactionEntity> findAllByOwnerUserIdIsNull();

    List<FactionEntity> findAllByOwnerUserId(UUID ownerUserId);

    Optional<FactionEntity> findByIdAndOwnerUserId(UUID id, UUID ownerUserId);

    Optional<FactionEntity> findByOwnerUserIdAndBaseFactionId(UUID ownerUserId, UUID baseFactionId);
}

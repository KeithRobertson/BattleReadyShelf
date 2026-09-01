package com.keith.battlereadyshelf.factiondefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

public interface FactionDraftRepository extends JpaRepository<FactionDraftEntity, UUID> {

    List<FactionDraftEntity> findAllByOrderByProposedNameAsc();

    List<FactionDraftEntity> findAllByFactionIdIn(List<UUID> factionIds);

    Optional<FactionDraftEntity> findByFactionId(UUID factionId);

    /** Indexes pending changes by the faction they target, which is unique per faction. */
    default Map<UUID, FactionDraftEntity> findAllByFactionId(List<UUID> factionIds) {
        if (factionIds.isEmpty()) {
            return Map.of();
        }
        return findAllByFactionIdIn(factionIds).stream()
                .collect(Collectors.toMap(d -> d.getFaction().getId(), d -> d));
    }
}

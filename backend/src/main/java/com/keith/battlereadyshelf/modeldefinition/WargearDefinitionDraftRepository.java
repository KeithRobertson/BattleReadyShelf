package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

public interface WargearDefinitionDraftRepository extends JpaRepository<WargearDefinitionDraftEntity, UUID> {

    List<WargearDefinitionDraftEntity> findAllByOrderByProposedNameAsc();

    List<WargearDefinitionDraftEntity> findAllByWargearDefinitionIdIn(List<UUID> wargearDefinitionIds);

    /** Indexes pending changes by the definition they target, which is unique per definition. */
    default Map<UUID, WargearDefinitionDraftEntity> findAllByDefinitionId(List<UUID> wargearDefinitionIds) {
        if (wargearDefinitionIds.isEmpty()) {
            return Map.of();
        }
        return findAllByWargearDefinitionIdIn(wargearDefinitionIds).stream()
                .collect(Collectors.toMap(d -> d.getWargearDefinition().getId(), d -> d));
    }
}

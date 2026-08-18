package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FactionRepository extends JpaRepository<FactionEntity, UUID> {
    Optional<FactionEntity> findByExternalId(String externalId);

    List<FactionEntity> findAllByExternalIdIn(List<String> externalIds);
}

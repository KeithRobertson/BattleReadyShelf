package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WargearDefinitionRepository extends JpaRepository<WargearDefinitionEntity, UUID> {
    Optional<WargearDefinitionEntity> findByExternalId(String externalId);

    List<WargearDefinitionEntity> findAllByExternalIdIn(List<String> externalIds);

    Optional<WargearDefinitionEntity> findFirstByExternalIdIsNullAndNameIgnoreCase(String name);
}

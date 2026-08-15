package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WargearOptionRepository extends JpaRepository<WargearOptionEntity, UUID> {
    List<WargearOptionEntity> findAllByModelDefinitionIdIn(List<UUID> modelDefinitionIds);
}

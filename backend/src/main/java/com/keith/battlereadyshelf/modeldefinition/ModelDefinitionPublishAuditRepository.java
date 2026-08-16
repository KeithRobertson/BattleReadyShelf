package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ModelDefinitionPublishAuditRepository
        extends JpaRepository<ModelDefinitionPublishAuditEntity, UUID> {
    List<ModelDefinitionPublishAuditEntity> findAllByModelDefinitionIdOrderByVersionDesc(UUID modelDefinitionId);
}

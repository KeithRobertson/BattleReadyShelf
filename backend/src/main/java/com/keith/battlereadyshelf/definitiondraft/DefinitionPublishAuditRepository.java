package com.keith.battlereadyshelf.definitiondraft;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DefinitionPublishAuditRepository
        extends JpaRepository<DefinitionPublishAuditEntity, UUID> {

    List<DefinitionPublishAuditEntity> findAllByDefinitionAndDefinitionIdOrderByPublishedAtDesc(
            Definition definition, UUID definitionId);
}

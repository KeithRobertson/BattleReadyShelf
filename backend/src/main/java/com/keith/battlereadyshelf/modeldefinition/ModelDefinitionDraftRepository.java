package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ModelDefinitionDraftRepository extends JpaRepository<ModelDefinitionDraftEntity, UUID> {
    Optional<ModelDefinitionDraftEntity> findByPublishedModelDefinitionId(UUID publishedModelDefinitionId);
}

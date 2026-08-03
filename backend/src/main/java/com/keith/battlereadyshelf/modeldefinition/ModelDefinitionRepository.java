package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ModelDefinitionRepository extends JpaRepository<ModelDefinitionEntity, UUID> {}

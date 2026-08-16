package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WargearOptionDraftRepository extends JpaRepository<WargearOptionDraftEntity, UUID> {
    List<WargearOptionDraftEntity> findAllByModelDefinitionDraftId(UUID modelDefinitionDraftId);

    List<WargearOptionDraftEntity> findAllByModelDefinitionDraftIdIn(List<UUID> modelDefinitionDraftIds);

    void deleteAllByModelDefinitionDraftId(UUID modelDefinitionDraftId);
}

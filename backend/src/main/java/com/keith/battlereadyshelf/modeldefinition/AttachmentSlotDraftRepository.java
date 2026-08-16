package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AttachmentSlotDraftRepository extends JpaRepository<AttachmentSlotDraftEntity, UUID> {
    List<AttachmentSlotDraftEntity> findAllByModelDefinitionDraftId(UUID modelDefinitionDraftId);

    List<AttachmentSlotDraftEntity> findAllByModelDefinitionDraftIdIn(List<UUID> modelDefinitionDraftIds);

    void deleteAllByModelDefinitionDraftId(UUID modelDefinitionDraftId);
}

package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AttachmentSlotRepository extends JpaRepository<AttachmentSlotEntity, UUID> {
    List<AttachmentSlotEntity> findAllByModelDefinitionIdIn(List<UUID> modelDefinitionIds);
}

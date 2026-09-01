package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.generated.model.AttachmentSlot;
import com.keith.battlereadyshelf.generated.model.AttachmentSlotDraft;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionDraft;
import com.keith.battlereadyshelf.generated.model.WargearOption;
import com.keith.battlereadyshelf.generated.model.WargearOptionDraft;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

import static java.time.ZoneOffset.UTC;

@Mapper(componentModel = "spring")
public interface ModelDefinitionMapper {
    @Mapping(target = "attachmentSlots", ignore = true)
    @Mapping(target = "wargearOptions", ignore = true)
    ModelDefinition toDto(ModelDefinitionEntity entity);

    AttachmentSlot toDto(AttachmentSlotEntity entity);

    @Mapping(target = "attachmentSlotIds", source = "attachmentSlots")
    @Mapping(target = "isDefault", source = "default")
    @Mapping(target = "name", source = "wargearDefinition.name")
    @Mapping(target = "externalId", source = "wargearDefinition.externalId")
    @Mapping(target = "wargearDefinitionId", source = "wargearDefinition.id")
    WargearOption toDto(WargearOptionEntity entity);

    default UUID attachmentSlotToId(AttachmentSlotEntity slot) {
        return slot.getId();
    }

    @Mapping(target = "attachmentSlots", ignore = true)
    @Mapping(target = "wargearOptions", ignore = true)
    ModelDefinitionDraft toDto(ModelDefinitionDraftEntity entity);

    AttachmentSlotDraft toDto(AttachmentSlotDraftEntity entity);

    @Mapping(target = "attachmentSlotIds", source = "attachmentSlots")
    @Mapping(target = "isDefault", source = "default")
    @Mapping(target = "name", source = "wargearDefinition.name")
    @Mapping(target = "externalId", source = "wargearDefinition.externalId")
    @Mapping(target = "wargearDefinitionId", source = "wargearDefinition.id")
    WargearOptionDraft toDto(WargearOptionDraftEntity entity);

    default UUID attachmentSlotDraftToId(AttachmentSlotDraftEntity slot) {
        return slot.getId();
    }

    default OffsetDateTime map(Instant instant) {
        return instant == null ? null : instant.atOffset(UTC);
    }
}

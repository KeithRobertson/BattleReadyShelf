package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.generated.model.AttachmentSlot;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.WargearOption;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface ModelDefinitionMapper {
    @Mapping(target = "attachmentSlots", ignore = true)
    @Mapping(target = "wargearOptions", ignore = true)
    ModelDefinition toDto(ModelDefinitionEntity entity);

    AttachmentSlot toDto(AttachmentSlotEntity entity);

    @Mapping(target = "attachmentSlotIds", source = "attachmentSlots")
    @Mapping(target = "isDefault", source = "default")
    WargearOption toDto(WargearOptionEntity entity);

    default UUID attachmentSlotToId(AttachmentSlotEntity slot) {
        return slot.getId();
    }
}

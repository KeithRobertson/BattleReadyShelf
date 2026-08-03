package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.generated.model.ModelDefinition;

import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ModelDefinitionMapper {
    ModelDefinition toDto(ModelDefinitionEntity entity);
}

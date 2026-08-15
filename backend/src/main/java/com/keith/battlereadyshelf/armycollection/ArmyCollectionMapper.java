package com.keith.battlereadyshelf.armycollection;

import com.keith.battlereadyshelf.generated.model.ArmyCollection;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface ArmyCollectionMapper {
    @Mapping(target = "modelCount", ignore = true)
    @Mapping(target = "modelCountsByStatus", ignore = true)
    ArmyCollection toDto(ArmyCollectionEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userId", source = "userId")
    @Mapping(target = "name", source = "armyCollection.name")
    @Mapping(target = "description", source = "armyCollection.description")
    ArmyCollectionEntity toEntity(UUID userId, ArmyCollection armyCollection);
}

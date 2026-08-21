package com.keith.battlereadyshelf.factiondefinition;

import com.keith.battlereadyshelf.generated.model.Faction;

import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface FactionDefinitionMapper {
    Faction toDto(FactionEntity entity);

    FactionEntity toEntity(Faction dto);
}

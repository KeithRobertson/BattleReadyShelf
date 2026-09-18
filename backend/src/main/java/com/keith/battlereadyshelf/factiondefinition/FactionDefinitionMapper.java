package com.keith.battlereadyshelf.factiondefinition;

import com.keith.battlereadyshelf.generated.model.Faction;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface FactionDefinitionMapper {
    /**
     * {@code hidden} is not on the entity: it is per-user, and only the personal list sets it. A
     * picker never needs it because a hidden faction is not in the list to begin with.
     */
    @Mapping(target = "hidden", ignore = true)
    Faction toDto(FactionEntity entity);

    FactionEntity toEntity(Faction dto);
}

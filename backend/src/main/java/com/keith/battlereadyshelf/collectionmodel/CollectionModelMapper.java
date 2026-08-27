package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.generated.model.CollectionModel;
import com.keith.battlereadyshelf.generated.model.WargearSelection;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionEntity;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionMapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

import static org.mapstruct.InjectionStrategy.CONSTRUCTOR;

@Mapper(
        componentModel = "spring",
        uses = {ModelDefinitionMapper.class, CollectionModelStatusMapper.class},
        injectionStrategy = CONSTRUCTOR)
public interface CollectionModelMapper {
    @Mapping(target = "modelDefinitionId", source = "modelDefinition.id")
    @Mapping(target = "images", ignore = true)
    @Mapping(target = "wargearSelections", ignore = true)
    CollectionModel toDto(CollectionModelEntity entity);

    WargearSelection toDto(CollectionModelWargearSelectionEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "armyCollectionId", source = "armyCollectionId")
    @Mapping(target = "modelDefinition", source = "modelDefinition")
    @Mapping(target = "name", source = "collectionModel.name")
    @Mapping(target = "description", source = "collectionModel.description")
    @Mapping(target = "status", source="collectionModel.status", defaultValue = "BOXED")
    CollectionModelEntity toEntity(
            UUID armyCollectionId,
            ModelDefinitionEntity modelDefinition,
            CollectionModel collectionModel);
}

package com.keith.battlereadyshelf.collectionmodel;

import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CollectionModelStatusMapper {

    com.keith.battlereadyshelf.collectionmodel.CollectionModelStatus toEntityStatus(
            com.keith.battlereadyshelf.generated.model.CollectionModelStatus status
    );

    default com.keith.battlereadyshelf.collectionmodel.CollectionModelStatus toEntityStatusOrDefault(
            com.keith.battlereadyshelf.generated.model.CollectionModelStatus status
    ) {
        if (status == null) {
            return com.keith.battlereadyshelf.collectionmodel.CollectionModelStatus.BOXED;
        }
        return toEntityStatus(status);
    }
}

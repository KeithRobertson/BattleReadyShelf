package com.keith.battlereadyshelf.collectionmodel;

import static java.time.ZoneOffset.UTC;

import com.keith.battlereadyshelf.generated.model.CollectionModelImage;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.Instant;
import java.time.OffsetDateTime;

@Mapper(componentModel = "spring")
public interface CollectionModelImageMapper {
    @Mapping(target = "url", ignore = true)
    CollectionModelImage toDto(CollectionModelImageEntity entity);

    default OffsetDateTime map(Instant instant) {
        return instant == null ? null : instant.atOffset(UTC);
    }
}

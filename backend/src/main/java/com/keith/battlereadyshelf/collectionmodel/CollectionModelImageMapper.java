package com.keith.battlereadyshelf.collectionmodel;

import static java.time.ZoneOffset.UTC;

import com.keith.battlereadyshelf.generated.model.CollectionModelImage;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.Instant;
import java.time.OffsetDateTime;

@Mapper(componentModel = "spring")
public interface CollectionModelImageMapper {
    @Mapping(target = "contentType", source = "original.contentType")
    @Mapping(target = "sizeBytes", source = "original.sizeBytes")
    @Mapping(target = "thumbnailUrl", ignore = true)
    @Mapping(target = "largeUrl", ignore = true)
    @Mapping(target = "originalUrl", ignore = true)
    CollectionModelImage toDto(CollectionModelImageEntity entity);

    default OffsetDateTime map(Instant instant) {
        return instant == null ? null : instant.atOffset(UTC);
    }
}

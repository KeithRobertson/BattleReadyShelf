package com.keith.battlereadyshelf.collectionmodel;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One stored rendition of a {@link CollectionModelImageEntity} (e.g. the original upload, or a
 * resized thumbnail/large rendition). {@code storageKey} is required for the original rendition;
 * it (and the other fields) may be {@code null} for the large/thumbnail renditions of images
 * uploaded before those renditions existed. {@code contentType} and {@code sizeBytes} are
 * best-effort metadata about the stored object.
 */
@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageVariant {
    @Column private String storageKey;

    @Column private String contentType;

    @Column private Long sizeBytes;
}

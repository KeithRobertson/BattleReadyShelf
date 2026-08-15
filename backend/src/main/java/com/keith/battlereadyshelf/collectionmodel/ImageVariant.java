package com.keith.battlereadyshelf.collectionmodel;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One stored rendition of a {@link CollectionModelImageEntity} (i.e. its resized large or
 * thumbnail rendition). {@code storageKey} may be {@code null} for images uploaded before the
 * large/thumbnail split existed. {@code contentType} and {@code sizeBytes} are best-effort
 * metadata about the stored object.
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

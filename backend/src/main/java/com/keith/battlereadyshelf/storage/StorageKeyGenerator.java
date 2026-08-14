package com.keith.battlereadyshelf.storage;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * Builds R2 object keys of the form {@code
 * {prefix}/users/{userId}/models/{modelId}/{imageId}/{variant}.{ext}}. The prefix segment
 * namespaces environments/developers sharing the same bucket (see {@link
 * StorageProperties#getPrefix()}), while the remaining path mirrors the ownership hierarchy
 * already enforced in Postgres. Each logical image has 3 renditions ({@code original}, {@code
 * large}, {@code thumbnail}) stored under the same {@code imageId} directory.
 */
@Component
public class StorageKeyGenerator {
    private static final Map<String, String> EXTENSIONS_BY_CONTENT_TYPE =
            Map.of(
                    "image/jpeg", "jpg",
                    "image/png", "png",
                    "image/webp", "webp",
                    "image/gif", "gif",
                    "image/heic", "heic");

    private final StorageProperties storageProperties;

    public StorageKeyGenerator(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    public String generateKey(
            UUID userId,
            UUID collectionModelId,
            UUID imageId,
            String variant,
            String contentType) {
        var extension = EXTENSIONS_BY_CONTENT_TYPE.get(contentType);
        var fileName = extension == null ? variant : variant + "." + extension;
        var prefix = storageProperties.getPrefix();

        return (prefix == null || prefix.isBlank() ? "" : prefix + "/")
                + "users/"
                + userId
                + "/models/"
                + collectionModelId
                + "/"
                + imageId
                + "/"
                + fileName;
    }

    public boolean isSupportedContentType(String contentType) {
        return EXTENSIONS_BY_CONTENT_TYPE.containsKey(contentType);
    }
}

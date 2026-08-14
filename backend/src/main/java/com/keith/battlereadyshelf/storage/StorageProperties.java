package com.keith.battlereadyshelf.storage;

import lombok.Getter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Configuration for user-uploaded image storage (Cloudflare R2), backed by {@code
 * battlereadyshelf.storage.uploads.*}.
 */
@Getter
@Component
public class StorageProperties {
    private final String bucket;
    private final String prefix;
    private final boolean enabled;
    private final long maxFileSizeBytes;

    public StorageProperties(
            @Value("${battlereadyshelf.storage.uploads.bucket}") String bucket,
            @Value("${battlereadyshelf.storage.uploads.prefix:}") String prefix,
            @Value("${battlereadyshelf.storage.uploads.enabled}") boolean enabled,
            @Value("${battlereadyshelf.storage.uploads.max-file-size-mb}") long maxFileSizeMb) {
        this.bucket = bucket;
        this.prefix = prefix;
        this.enabled = enabled;
        this.maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
    }
}

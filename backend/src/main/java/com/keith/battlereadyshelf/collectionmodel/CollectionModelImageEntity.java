package com.keith.battlereadyshelf.collectionmodel;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import org.springframework.data.domain.Persistable;

import java.time.Instant;
import java.util.UUID;

/**
 * An image attached to a {@link CollectionModelEntity}, stored in Cloudflare R2 as 2 renditions:
 * a large (~1600px) rendition for detail views, and a thumbnail (~300px) rendition for list/grid
 * views. The original, unmodified upload is never stored -- only these re-encoded renditions,
 * which also lets us cap the storage cost per image via the client-side compression budget.
 *
 * <p>Implements {@link Persistable} because {@code id} is assigned up-front (so it can be reused
 * across the R2 storage keys before the entity is ever saved) rather than left {@code null} for
 * Hibernate to generate on insert. Without this, Spring Data JPA's default "is this entity new?"
 * check (which just checks for a null {@code id}) would treat the entity as already persisted and
 * issue an {@code UPDATE} instead of an {@code INSERT}, failing with a {@code
 * StaleObjectStateException} since no matching row exists yet.
 */
@Entity
@Table(name = "collection_model_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionModelImageEntity implements Persistable<UUID> {
    @Id private UUID id;

    @Transient
    @Builder.Default
    @Getter(AccessLevel.NONE)
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private boolean isNew = true;

    @Column(name = "collection_model_id", nullable = false)
    private UUID collectionModelId;

    @Embedded
    @AttributeOverride(name = "storageKey", column = @Column(name = "large_storage_key"))
    @AttributeOverride(name = "contentType", column = @Column(name = "large_content_type"))
    @AttributeOverride(name = "sizeBytes", column = @Column(name = "large_size_bytes"))
    private ImageVariant large;

    @Embedded
    @AttributeOverride(name = "storageKey", column = @Column(name = "thumbnail_storage_key"))
    @AttributeOverride(name = "contentType", column = @Column(name = "thumbnail_content_type"))
    @AttributeOverride(name = "sizeBytes", column = @Column(name = "thumbnail_size_bytes"))
    private ImageVariant thumbnail;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PostPersist
    @PostLoad
    void markNotNew() {
        this.isNew = false;
    }
}

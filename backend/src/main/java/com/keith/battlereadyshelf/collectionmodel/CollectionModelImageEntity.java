package com.keith.battlereadyshelf.collectionmodel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Placeholder entity for images attached to a {@link CollectionModelEntity}. No upload capability
 * exists yet; this table will be populated once Cloudflare R2 presigned-url uploads are wired up.
 */
@Entity
@Table(name = "collection_model_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionModelImageEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "collection_model_id", nullable = false)
    private UUID collectionModelId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

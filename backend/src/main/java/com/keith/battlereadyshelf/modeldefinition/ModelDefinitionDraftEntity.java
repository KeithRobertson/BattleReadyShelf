package com.keith.battlereadyshelf.modeldefinition;

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

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * An admin's in-progress edit of a {@link ModelDefinitionEntity}. If {@code
 * publishedModelDefinitionId} is null, this draft represents a brand-new model definition that
 * has never been published. Drafts are not visible to regular users; publishing a draft upserts
 * its data (and that of its {@link AttachmentSlotDraftEntity}/{@link WargearOptionDraftEntity}
 * children) onto the published tables and records a {@link ModelDefinitionPublishAuditEntity}.
 */
@Entity
@Table(name = "model_definition_drafts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModelDefinitionDraftEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "published_model_definition_id")
    private UUID publishedModelDefinitionId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_by", nullable = false)
    private UUID updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}

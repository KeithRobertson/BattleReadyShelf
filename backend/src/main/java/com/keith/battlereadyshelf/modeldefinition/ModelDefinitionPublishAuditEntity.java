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

import java.time.Instant;
import java.util.UUID;

/**
 * An immutable audit record of a single publish of a {@link ModelDefinitionEntity}, storing a
 * full JSON snapshot (see {@link ModelDefinitionSnapshotMapper}) of the model definition as it
 * looked immediately after that publish, along with who published it and an optional
 * admin-supplied summary of the change.
 */
@Entity
@Table(name = "model_definition_publish_audit")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModelDefinitionPublishAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "model_definition_id", nullable = false)
    private UUID modelDefinitionId;

    @Column(nullable = false)
    private int version;

    @Column(name = "published_by", nullable = false)
    private UUID publishedBy;

    @CreationTimestamp
    @Column(name = "published_at", nullable = false, updatable = false)
    private Instant publishedAt;

    @Column(name = "change_summary", columnDefinition = "text")
    private String changeSummary;

    @Column(nullable = false, columnDefinition = "text")
    private String snapshot;
}

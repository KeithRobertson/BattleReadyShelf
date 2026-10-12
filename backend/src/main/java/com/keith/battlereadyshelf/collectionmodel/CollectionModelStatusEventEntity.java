package com.keith.battlereadyshelf.collectionmodel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * One moment a collection model entered a status. The newest row is the current status; older rows
 * are the audit of how it got there.
 */
@Entity
@Table(name = "collection_model_status_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionModelStatusEventEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "collection_model_id", nullable = false)
    private UUID collectionModelId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "collection_model_status")
    private CollectionModelStatus status;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;
}

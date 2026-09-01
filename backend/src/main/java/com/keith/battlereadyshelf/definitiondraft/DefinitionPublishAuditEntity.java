package com.keith.battlereadyshelf.definitiondraft;

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

import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * An immutable record of one accepted change to a faction or wargear definition.
 *
 * <p>Both states are stored rather than just the result, because the value of this trail is
 * reading it as a diff: "who turned this name into that name, and was it the dataset's idea or
 * ours?". Storing only the outcome would leave a reader unable to tell what an entry actually
 * changed.
 */
@Entity
@Table(name = "definition_publish_audit")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DefinitionPublishAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "definition", nullable = false)
    private Definition definition;

    @Column(name = "definition_id", nullable = false)
    private UUID definitionId;

    @Column(name = "published_by", nullable = false)
    private UUID publishedBy;

    @CreationTimestamp
    @Column(name = "published_at", nullable = false, updatable = false)
    private Instant publishedAt;

    /** Whether the accepted change was originally raised by an import or typed by an admin. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProposalOrigin origin;

    @Column(name = "previous_state", nullable = false, columnDefinition = "text")
    private String previousState;

    @Column(name = "new_state", nullable = false, columnDefinition = "text")
    private String newState;
}

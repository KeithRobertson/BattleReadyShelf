package com.keith.battlereadyshelf.modeldefinition;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * A pending rename of a {@link WargearDefinitionEntity}, proposed by an import and awaiting an
 * admin's decision.
 *
 * <p>Imports deliberately do not rename shared wargear in place. One definition backs every model
 * that carries that item, so an unattended rename would fan out across the catalogue and could
 * silently discard a correction an admin made in the app. Staging the change keeps the reference
 * dataset able to propose fixes while leaving the final say with a human.
 *
 * <p>A definition has at most one pending change: re-importing simply refreshes it.
 */
@Entity
@Table(name = "wargear_definition_drafts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WargearDefinitionDraftEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "wargear_definition_id", nullable = false)
    private WargearDefinitionEntity wargearDefinition;

    @Column(name = "proposed_name", nullable = false)
    private String proposedName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

package com.keith.battlereadyshelf.factiondefinition;

import com.keith.battlereadyshelf.definitiondraft.ProposalOrigin;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A pending change to a {@link FactionEntity}, awaiting an admin's decision.
 *
 * <p>Factions are not renamed or reparented in place, whatever proposes the change. A faction
 * groups every model definition beneath it, so reparenting one silently moves that whole subtree,
 * and an unattended rename could discard a correction an admin made in the app. Staging the
 * change keeps the reference dataset able to propose fixes while leaving the final say with a
 * human.
 *
 * <p>A faction has at most one pending change: proposing again simply refreshes it.
 *
 * <p>The draft carries the <em>complete</em> proposed state, so a null {@code
 * proposedParentFaction} proposes clearing the parent rather than leaving it alone.
 */
@Entity
@Table(name = "faction_drafts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FactionDraftEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "faction_id", nullable = false)
    private FactionEntity faction;

    @Column(name = "proposed_name", nullable = false)
    private String proposedName;

    @Column(name = "proposed_parent_faction_id")
    private UUID proposedParentFactionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProposalOrigin origin;

    /**
     * Set when the draft is built rather than generated on insert: the draft is read back as a DTO
     * inside the same transaction, before any flush would have filled a generated value in.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

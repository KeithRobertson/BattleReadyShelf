package com.keith.battlereadyshelf.paint;

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

import java.time.Instant;
import java.util.UUID;

/**
 * A pending change to a catalogue {@link PaintEntity}, awaiting an admin's decision.
 *
 * <p>Catalogue paints are not edited in place. One row backs every recipe that names the paint, so
 * a rename or a recolour fans out across everybody's collections at once - and paint ranges really
 * are renamed and reformulated, so these proposals are routine rather than exceptional.
 *
 * <p>A paint has at most one pending change: proposing again refreshes it. The draft carries the
 * <em>complete</em> proposed state, so a null proposed brand, type or colour proposes clearing that
 * field rather than leaving it alone.
 */
@Entity
@Table(name = "paint_drafts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaintDraftEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "paint_id", nullable = false)
    private PaintEntity paint;

    @Column(name = "proposed_name", nullable = false)
    private String proposedName;

    @Column(name = "proposed_brand")
    private String proposedBrand;

    @Enumerated(EnumType.STRING)
    @Column(name = "proposed_paint_type")
    private PaintType proposedPaintType;

    @Column(name = "proposed_hex_colour", length = 7)
    private String proposedHexColour;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProposalOrigin origin;

    /**
     * Set when the draft is built rather than generated on insert: the draft is read back as a DTO
     * inside the same transaction, before any flush would have filled a generated value in.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

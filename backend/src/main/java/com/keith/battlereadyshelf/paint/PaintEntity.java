package com.keith.battlereadyshelf.paint;

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

import java.util.UUID;

/**
 * A paint that can be recorded in a {@link PaintRecipeEntity}, e.g. Citadel's "Leadbelcher".
 *
 * <p>{@code brand} is part of the identity rather than a label: paint names are only unique within
 * a manufacturer, and several sell a "Bone White". That is why the uniqueness rules are on brand
 * and name together.
 *
 * <p>{@code hexColour} is a swatch, not a colour match. A flat RGB value cannot honestly represent
 * a metallic, a shade or a contrast paint, so it exists to make a list scannable rather than to be
 * mixed from.
 *
 * <p>As with factions and wargear, {@code ownerUserId} is null for the shared catalogue and set for
 * a paint only its owner can see - a mix of their own, or a brand the catalogue doesn't carry.
 * {@code basePaintId} records that a personal paint was forked from a catalogue one rather than
 * invented, which is what lets the app show how it differs and offer to revert it.
 */
@Entity
@Table(name = "paints")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaintEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_id")
    private String externalId;

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    @Column(name = "base_paint_id")
    private UUID basePaintId;

    @Column(nullable = false)
    private String name;

    @Column private String brand;

    @Enumerated(EnumType.STRING)
    @Column(name = "paint_type")
    private PaintType paintType;

    @Column(name = "hex_colour", length = 7)
    private String hexColour;
}

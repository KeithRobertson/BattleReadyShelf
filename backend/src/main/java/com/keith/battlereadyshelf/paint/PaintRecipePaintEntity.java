package com.keith.battlereadyshelf.paint;

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
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.UUID;

/**
 * One paint's place in a recipe: which paint, where in the order, and what it was used for.
 *
 * <p>The same paint may appear more than once - a metal is commonly both a base and an edge
 * highlight - so entries are not unique by paint, only by position.
 *
 * <p>{@code position} is stored rather than inferred from insertion order because reordering a
 * recipe is an ordinary edit, and the order is the closest thing a recipe has to instructions.
 */
@Entity
@Table(name = "paint_recipe_paints")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaintRecipePaintEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Excluded from equals/hashCode and toString to break the cycle with {@link
     * PaintRecipeEntity#getPaints()}, which would otherwise recurse.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipe_id", nullable = false)
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private PaintRecipeEntity recipe;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "paint_id", nullable = false)
    private PaintEntity paint;

    @Column(nullable = false)
    private Integer position;

    @Column(name = "step_label")
    private String stepLabel;

    @Column private String note;

    /**
     * Whether this step is one of the few swatches a model card has room for. Recorded rather than
     * derived at render time because which colours represent a model is the owner's judgement, not
     * a function of the order they happen to be applied in.
     */
    @Column(name = "show_on_card", nullable = false)
    private boolean showOnCard;
}

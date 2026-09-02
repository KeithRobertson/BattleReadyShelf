package com.keith.battlereadyshelf.paint;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * How a user painted something: the paints they used, in order, plus free text describing their
 * use.
 *
 * <p>One entity covers all three scopes because the payload is identical at each - only what the
 * recipe hangs off changes. See {@link PaintRecipeScope} for why a recipe is worth attaching above
 * the level of an individual miniature.
 *
 * <p>A MODEL_TYPE recipe is identified by the (collection, model definition) pair rather than a
 * group id, because the "groups" the collection page shows are derived by grouping a collection's
 * models by their definition and have no stored identity of their own.
 *
 * <p>Ownership is deliberately not stored here. A recipe always belongs to exactly one collection
 * and a collection already records its owner, so repeating it would create a second source of truth
 * that could disagree.
 */
@Entity
@Table(name = "paint_recipes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaintRecipeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaintRecipeScope scope;

    @Column(name = "army_collection_id", nullable = false)
    private UUID armyCollectionId;

    /** Set for a MODEL_TYPE recipe, null otherwise. A database check constraint enforces that. */
    @Column(name = "model_definition_id")
    private UUID modelDefinitionId;

    /** Set for a MODEL recipe, null otherwise. A database check constraint enforces that. */
    @Column(name = "collection_model_id")
    private UUID collectionModelId;

    @Column private String notes;

    /**
     * Owned by the recipe rather than merely referenced: an entry has no meaning outside the recipe
     * it belongs to, so saving replaces the whole list and removing one deletes it.
     */
    @OneToMany(
            mappedBy = "recipe",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER)
    @OrderBy("position ASC")
    @Builder.Default
    private List<PaintRecipePaintEntity> paints = new ArrayList<>();

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Keeps both sides of the association consistent, which orphan removal depends on. */
    public void replacePaints(List<PaintRecipePaintEntity> replacements) {
        paints.clear();
        replacements.forEach(
                entry -> {
                    entry.setRecipe(this);
                    paints.add(entry);
                });
    }
}

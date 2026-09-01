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

import java.util.UUID;

/**
 * One type of miniature. A row with a null {@link #ownerUserId} belongs to the global catalogue
 * that admins curate and the reference dataset imports into; a row with an owner is that user's
 * own definition, visible only to them.
 *
 * <p>Personal definitions deliberately live in this same table so collection models, wargear
 * selections and every existing read path reference them through the foreign keys they already
 * use, rather than needing a second, polymorphic reference.
 */
@Entity
@Table(name = "model_definitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModelDefinitionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_id", unique = true)
    private String externalId;

    /** Null for the global catalogue; set to the owning user for a personal definition. */
    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    /**
     * The global definition this personal one was forked from, or null when the user wrote it
     * from scratch. Drives the personal-vs-global diff and the "revert to global" action.
     */
    @Column(name = "base_model_definition_id")
    private UUID baseModelDefinitionId;

    @Column(name = "faction_id")
    private UUID factionId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Builder.Default
    @Column(nullable = false)
    private int version = 1;
}

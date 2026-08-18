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
 * Categorises {@link ModelDefinitionEntity model definitions} for catalogue organisation/
 * filtering only (e.g. "Space Marines", "Death Guard"). A faction may optionally have a parent,
 * forming a simple hierarchy. This carries no army-building rules: no legality, availability,
 * inclusion/exclusion, or points implications of any kind.
 *
 * <p>Unlike model definitions, factions have no draft/publish workflow - they are simple
 * reference data, upserted directly by {@code externalId} when importing a {@code
 * ModelDefinitionExport} document.
 */
@Entity
@Table(name = "factions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FactionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_id", nullable = false, unique = true)
    private String externalId;

    @Column(nullable = false)
    private String name;

    @Column(name = "parent_faction_id")
    private UUID parentFactionId;
}

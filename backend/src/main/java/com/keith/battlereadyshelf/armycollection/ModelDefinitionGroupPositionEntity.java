package com.keith.battlereadyshelf.armycollection;

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
 * Persists the user-chosen display order of a single model-definition group (accordion section,
 * e.g. "Poxwalker") within a single {@link ArmyCollectionEntity}. Groups without a row here fall
 * back to alphabetical order at the end of the list (see {@code ArmyCollectionsService}).
 */
@Entity
@Table(name = "army_collection_model_definition_positions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModelDefinitionGroupPositionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "army_collection_id", nullable = false)
    private UUID armyCollectionId;

    @Column(name = "model_definition_id", nullable = false)
    private UUID modelDefinitionId;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;
}

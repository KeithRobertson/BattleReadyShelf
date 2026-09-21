package com.keith.battlereadyshelf.collectionmodel;

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
 * An extra datasheet this physical miniature can be fielded as. The current type lives on
 * {@link CollectionModelEntity#getModelDefinition()}, not here.
 */
@Entity
@Table(name = "collection_model_identities")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionModelIdentityEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "collection_model_id", nullable = false)
    private UUID collectionModelId;

    @Column(name = "model_definition_id", nullable = false)
    private UUID modelDefinitionId;
}

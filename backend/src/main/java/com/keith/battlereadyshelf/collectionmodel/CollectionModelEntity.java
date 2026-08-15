package com.keith.battlereadyshelf.collectionmodel;

import static jakarta.persistence.FetchType.*;

import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;
import java.time.LocalDate;

@Entity
@Table(name = "collection_models")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionModelEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "army_collection_id", nullable = false)
    private UUID armyCollectionId;

    @ManyToOne(fetch = LAZY)
    @JoinColumn(name = "model_definition_id", nullable = false)
    private ModelDefinitionEntity modelDefinition;

    @Column private String name;

    @Column private String description;

    @Column(name = "finished_on")
    private LocalDate finishedOn;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "collection_model_status")
    @Builder.Default
    private CollectionModelStatus status = CollectionModelStatus.BOXED;
}

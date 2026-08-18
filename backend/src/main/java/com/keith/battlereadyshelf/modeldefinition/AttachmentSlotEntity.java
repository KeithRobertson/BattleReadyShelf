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
 * A slot on a {@link ModelDefinitionEntity} (e.g. "Left Arm", "Right Arm") that can be filled
 * with wargear when a user builds their own instance of the model.
 */
@Entity
@Table(name = "attachment_slots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttachmentSlotEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "model_definition_id", nullable = false)
    private UUID modelDefinitionId;

    @Column(name = "external_id")
    private String externalId;

    @Column(nullable = false)
    private String name;
}

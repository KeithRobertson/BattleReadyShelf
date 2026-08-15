package com.keith.battlereadyshelf.modeldefinition;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A known wargear item for a {@link ModelDefinitionEntity} (e.g. "Boltgun", "Heavy Plague
 * Weapon") and the attachment slot(s) it fills. An option filling more than one slot (e.g. a
 * two-handed weapon) consumes all of those slots at once. This is not an exhaustive/enforced
 * catalog - it exists to describe common/default loadouts; users remain free to put anything
 * they like into a slot.
 */
@Entity
@Table(name = "wargear_options")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WargearOptionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "model_definition_id", nullable = false)
    private UUID modelDefinitionId;

    @Column(nullable = false)
    private String name;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "wargear_option_slots",
            joinColumns = @JoinColumn(name = "wargear_option_id"),
            inverseJoinColumns = @JoinColumn(name = "attachment_slot_id"))
    private List<AttachmentSlotEntity> attachmentSlots = new ArrayList<>();
}

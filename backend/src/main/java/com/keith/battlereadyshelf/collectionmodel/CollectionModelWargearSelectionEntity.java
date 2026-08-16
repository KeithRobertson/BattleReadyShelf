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
 * What a user has assigned to one of their owned {@link CollectionModelEntity}'s attachment
 * slots (e.g. a Boltgun in a Plague Marine's left arm).
 */
@Entity
@Table(name = "collection_model_wargear_selections")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionModelWargearSelectionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "collection_model_id", nullable = false)
    private UUID collectionModelId;

    @Column(name = "attachment_slot_id", nullable = false)
    private UUID attachmentSlotId;

    @Column(name = "wargear_option_id")
    private UUID wargearOptionId;

    /**
     * A free-text, user-entered wargear name for this slot when no existing {@link
     * com.keith.battlereadyshelf.modeldefinition.WargearOptionEntity} matches what they actually
     * modeled (e.g. a converted/homebrew loadout). Mutually exclusive with {@link
     * #wargearOptionId}; doesn't participate in army list validation since it isn't a recognised
     * wargear option, but lets users still record what they built.
     */
    @Column(name = "custom_label")
    private String customLabel;
}

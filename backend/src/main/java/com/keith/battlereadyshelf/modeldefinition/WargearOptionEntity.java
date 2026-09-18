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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * One model definition's use of a {@link WargearDefinitionEntity} on that model. {@code
 * attachmentSlots} are where the item <em>may</em> go (eligibility). Listing more than one slot
 * does not mean one copy occupies all of them; whether two slots share one physical item is
 * recorded on the collection loadout. This is not an exhaustive/enforced catalog - it exists to
 * describe common/default loadouts; users remain free to put anything they like into a slot.
 *
 * <p>The wargear's identity and name live on the shared definition, so the same item used by many
 * models is named once. Only what varies per model - eligible slots and whether it is part of the
 * default loadout - is stored here.
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

    /**
     * The global option this one was forked from when its model definition was customised by a
     * user, so the personal-vs-global diff can tell an edited option from a newly added one.
     */
    @Column(name = "base_wargear_option_id")
    private UUID baseWargearOptionId;

    /**
     * Eager because callers almost always need the name, and the number of distinct definitions is
     * small enough that the persistence context absorbs the repeat lookups.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "wargear_definition_id", nullable = false)
    private WargearDefinitionEntity wargearDefinition;

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

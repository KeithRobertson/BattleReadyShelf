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
 * A draft edit of a {@link WargearOptionEntity}. If {@code publishedWargearOptionId} is null,
 * this option is new and will be created on publish; otherwise publishing updates the existing
 * published option in place, preserving its id.
 */
@Entity
@Table(name = "wargear_option_drafts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WargearOptionDraftEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "model_definition_draft_id", nullable = false)
    private UUID modelDefinitionDraftId;

    @Column(name = "published_wargear_option_id")
    private UUID publishedWargearOptionId;

    @Column(name = "external_id")
    private String externalId;

    @Column(nullable = false)
    private String name;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "wargear_option_slot_drafts",
            joinColumns = @JoinColumn(name = "wargear_option_draft_id"),
            inverseJoinColumns = @JoinColumn(name = "attachment_slot_draft_id"))
    private List<AttachmentSlotDraftEntity> attachmentSlots = new ArrayList<>();
}

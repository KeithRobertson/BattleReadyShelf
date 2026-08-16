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
 * A draft edit of an {@link AttachmentSlotEntity}. If {@code publishedAttachmentSlotId} is null,
 * this slot is new and will be created on publish; otherwise publishing updates the existing
 * published slot in place, preserving its id.
 */
@Entity
@Table(name = "attachment_slot_drafts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttachmentSlotDraftEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "model_definition_draft_id", nullable = false)
    private UUID modelDefinitionDraftId;

    @Column(name = "published_attachment_slot_id")
    private UUID publishedAttachmentSlotId;

    @Column(nullable = false)
    private String name;
}

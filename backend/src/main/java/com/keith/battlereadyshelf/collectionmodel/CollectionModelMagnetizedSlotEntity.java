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

/** A slot on this miniature that is magnetised and may hold several owned bits. */
@Entity
@Table(name = "collection_model_magnetized_slots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionModelMagnetizedSlotEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "collection_model_id", nullable = false)
    private UUID collectionModelId;

    @Column(name = "attachment_slot_id", nullable = false)
    private UUID attachmentSlotId;
}

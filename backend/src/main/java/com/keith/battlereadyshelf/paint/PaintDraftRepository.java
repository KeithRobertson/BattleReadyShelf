package com.keith.battlereadyshelf.paint;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaintDraftRepository extends JpaRepository<PaintDraftEntity, UUID> {
    List<PaintDraftEntity> findAllByOrderByProposedNameAsc();

    Optional<PaintDraftEntity> findByPaintId(UUID paintId);

    List<PaintDraftEntity> findAllByPaintIdIn(List<UUID> paintIds);
}

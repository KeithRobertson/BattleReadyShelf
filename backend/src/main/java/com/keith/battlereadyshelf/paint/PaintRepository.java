package com.keith.battlereadyshelf.paint;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaintRepository extends JpaRepository<PaintEntity, UUID> {
    List<PaintEntity> findAllByOwnerUserIdIsNull();

    List<PaintEntity> findAllByOwnerUserId(UUID ownerUserId);

    Optional<PaintEntity> findByIdAndOwnerUserId(UUID id, UUID ownerUserId);

    Optional<PaintEntity> findByOwnerUserIdAndBasePaintId(UUID ownerUserId, UUID basePaintId);

    boolean existsByBasePaintId(UUID basePaintId);

    /**
     * Catalogue paints carrying any of the given dataset ids. Restricted to the shared catalogue
     * because a user's own paint is never matched, let alone edited, by an import.
     */
    List<PaintEntity> findAllByOwnerUserIdIsNullAndExternalIdIn(List<String> externalIds);

    /**
     * A name clash within one owner's paints, treating a missing brand as its own value so two
     * brandless mixes called the same thing still collide. Passing a null ownerUserId checks the
     * shared catalogue.
     */
    @Query(
            """
            SELECT p FROM PaintEntity p
            WHERE (:ownerUserId IS NULL AND p.ownerUserId IS NULL
                   OR p.ownerUserId = :ownerUserId)
              AND lower(p.name) = lower(:name)
              AND (:brand IS NULL AND p.brand IS NULL OR lower(p.brand) = lower(:brand))
            """)
    Optional<PaintEntity> findClash(UUID ownerUserId, String name, String brand);
}

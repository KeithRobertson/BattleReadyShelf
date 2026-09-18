package com.keith.battlereadyshelf.hiddendefinition;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

public interface UserHiddenPaintRepository extends JpaRepository<UserHiddenPaintEntity, UUID> {

    /** Just the ids, because every caller only needs to ask "is this one hidden?". */
    @Query("select h.paintId from UserHiddenPaintEntity h where h.userId = :userId")
    Set<UUID> findHiddenIdsByUserId(@Param("userId") UUID userId);

    void deleteByUserIdAndPaintIdIn(UUID userId, Collection<UUID> paintIds);
}

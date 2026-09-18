package com.keith.battlereadyshelf.hiddendefinition;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

public interface UserHiddenWargearDefinitionRepository
        extends JpaRepository<UserHiddenWargearDefinitionEntity, UUID> {

    /** Just the ids, because every caller only needs to ask "is this one hidden?". */
    @Query("select h.wargearDefinitionId from UserHiddenWargearDefinitionEntity h where h.userId = :userId")
    Set<UUID> findHiddenIdsByUserId(@Param("userId") UUID userId);

    void deleteByUserIdAndWargearDefinitionIdIn(UUID userId, Collection<UUID> wargearDefinitionIds);
}

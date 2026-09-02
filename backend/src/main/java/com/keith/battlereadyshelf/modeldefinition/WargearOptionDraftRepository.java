package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface WargearOptionDraftRepository extends JpaRepository<WargearOptionDraftEntity, UUID> {
    List<WargearOptionDraftEntity> findAllByModelDefinitionDraftId(UUID modelDefinitionDraftId);

    /**
     * Draft options with their wargear definition and filled slots already loaded.
     *
     * <p>See {@link WargearOptionRepository#findAllByModelDefinitionIdIn(List)}: the draft side has
     * the same eager definition and lazy slot collection, so it pays the same two-queries-per-option
     * cost without these fetch joins.
     *
     * <p>{@code distinct} is required because joining the slot collection repeats an option once
     * per slot it fills.
     */
    @Query(
            "select distinct o from WargearOptionDraftEntity o"
                    + " join fetch o.wargearDefinition"
                    + " left join fetch o.attachmentSlots"
                    + " where o.modelDefinitionDraftId in :modelDefinitionDraftIds")
    List<WargearOptionDraftEntity> findAllByModelDefinitionDraftIdIn(List<UUID> modelDefinitionDraftIds);

    void deleteAllByModelDefinitionDraftId(UUID modelDefinitionDraftId);
}

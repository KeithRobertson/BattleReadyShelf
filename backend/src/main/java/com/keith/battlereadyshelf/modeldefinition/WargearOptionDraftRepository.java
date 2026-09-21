package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
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
                    + " left join fetch o.defaultAttachmentSlots"
                    + " where o.modelDefinitionDraftId in :modelDefinitionDraftIds")
    List<WargearOptionDraftEntity> findAllByModelDefinitionDraftIdIn(List<UUID> modelDefinitionDraftIds);

    /**
     * Flat draft option rows for import skip comparison. See {@link
     * WargearOptionRepository#findSignatureAttributesByModelDefinitionIdIn(Collection)}.
     */
    @Query(
            "select o.modelDefinitionDraftId, o.id, wd.externalId, wd.id, wd.name, o.isDefault,"
                    + " o.defaultLinked from WargearOptionDraftEntity o join o.wargearDefinition wd"
                    + " where o.modelDefinitionDraftId in :modelDefinitionDraftIds")
    List<Object[]> findSignatureAttributesByModelDefinitionDraftIdIn(
            Collection<UUID> modelDefinitionDraftIds);

    @Query(
            "select o.id, s.id, s.externalId from WargearOptionDraftEntity o join o.attachmentSlots s"
                    + " where o.modelDefinitionDraftId in :modelDefinitionDraftIds")
    List<Object[]> findEligibilitySlotRowsByModelDefinitionDraftIdIn(
            Collection<UUID> modelDefinitionDraftIds);

    @Query(
            "select o.id, s.id, s.externalId from WargearOptionDraftEntity o"
                    + " join o.defaultAttachmentSlots s"
                    + " where o.modelDefinitionDraftId in :modelDefinitionDraftIds")
    List<Object[]> findDefaultSlotRowsByModelDefinitionDraftIdIn(
            Collection<UUID> modelDefinitionDraftIds);

    /**
     * Draft options with their wargear definition loaded, and neither slot collection. Import
     * overlay only needs the published option id and wargear identity so it can delete and
     * recreate children without a cartesian fetch.
     */
    @Query(
            "select distinct o from WargearOptionDraftEntity o join fetch o.wargearDefinition"
                    + " where o.modelDefinitionDraftId in :modelDefinitionDraftIds")
    List<WargearOptionDraftEntity> findAllWithDefinitionByModelDefinitionDraftIdIn(
            List<UUID> modelDefinitionDraftIds);

    void deleteAllByModelDefinitionDraftId(UUID modelDefinitionDraftId);
}

package com.keith.battlereadyshelf.modeldefinition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WargearDefinitionRepository extends JpaRepository<WargearDefinitionEntity, UUID> {
    Optional<WargearDefinitionEntity> findByExternalId(String externalId);

    List<WargearDefinitionEntity> findAllByExternalIdIn(List<String> externalIds);

    /**
     * The shared catalogue: wargear from the reference dataset plus anything an admin authored by
     * hand. Excludes personal wargear so users' conversions never leak into the admin pages,
     * exports or another user's picker.
     */
    List<WargearDefinitionEntity> findAllByOwnerUserIdIsNull();

    List<WargearDefinitionEntity> findAllByOwnerUserId(UUID ownerUserId);

    /** The shared catalogue plus, when matching by name for a user, the dataset-owned rows too. */
    Optional<WargearDefinitionEntity> findFirstByOwnerUserIdIsNullAndNameIgnoreCase(String name);

    Optional<WargearDefinitionEntity> findFirstByExternalIdIsNullAndOwnerUserIdIsNullAndNameIgnoreCase(
            String name);

    Optional<WargearDefinitionEntity> findFirstByOwnerUserIdAndNameIgnoreCase(
            UUID ownerUserId, String name);

    Optional<WargearDefinitionEntity> findByIdAndOwnerUserId(UUID id, UUID ownerUserId);

    Optional<WargearDefinitionEntity> findByOwnerUserIdAndBaseWargearDefinitionId(
            UUID ownerUserId, UUID baseWargearDefinitionId);
}

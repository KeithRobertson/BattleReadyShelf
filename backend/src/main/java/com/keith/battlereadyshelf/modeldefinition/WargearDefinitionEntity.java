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
 * A canonical piece of wargear (e.g. "Shuriken Pistol"), shared by every model definition that
 * can be equipped with it. A {@link WargearOptionEntity} is one model's <em>use</em> of this
 * definition and carries the details that vary per model - which slot(s) it fills and whether it
 * is part of the default loadout - while the identity and name live here and are edited in one
 * place.
 *
 * <p>{@code externalId} is the stable id from the reference dataset and is null for wargear an
 * admin created by hand. Ids are a single global namespace rather than being scoped per faction,
 * because the dataset already reuses them across factions (e.g. {@code plasma_pistol} appears in
 * Death Guard, Space Marines and Space Wolves).
 *
 * <p>{@code ownerUserId} is null for the shared catalogue. A user who names wargear the catalogue
 * doesn't have (a conversion, a homebrew loadout) gets their own definition instead, owned by
 * them and invisible to everyone else, so personal edits never pollute the shared list.
 */
@Entity
@Table(name = "wargear_definitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WargearDefinitionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_id")
    private String externalId;

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    @Column(nullable = false)
    private String name;
}

package com.keith.battlereadyshelf.factiondefinition;

import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionEntity;
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
 * Categorises {@link ModelDefinitionEntity model definitions} for catalogue organisation/
 * filtering only (e.g. "Space Marines", "Death Guard"). A faction may optionally have a parent,
 * forming a simple hierarchy. This carries no army-building rules: no legality, availability,
 * inclusion/exclusion, or points implications of any kind.
 *
 * <p>Changes to an existing faction are staged as a {@link FactionDraftEntity} rather than applied
 * in place, because a faction groups every model definition beneath it: reparenting one moves that
 * whole subtree, and an unattended rename could discard a correction an admin made in the app.
 * Factions the catalogue does not have yet are still created outright by an import - there is
 * nothing to review about an addition, and staging one would leave a new faction's parent
 * unresolvable when that parent is also new.
 *
 * <p>{@code ownerUserId} is null for the shared catalogue. A user may add factions of their own
 * (a homebrew warband, a successor chapter) or fork a shared one to rename or reparent it just for
 * themselves; either way the row is invisible to everyone else and never enters the draft/publish
 * workflow above, which governs the shared catalogue alone. {@code baseFactionId} records the fork
 * so the app can show how a personal version differs from the shared one and offer to revert it.
 *
 * <p>{@code externalId} is the dataset's id and is null for anything not imported, which includes
 * every personal faction.
 */
@Entity
@Table(name = "factions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FactionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_id", unique = true)
    private String externalId;

    @Column(nullable = false)
    private String name;

    @Column(name = "parent_faction_id")
    private UUID parentFactionId;

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    @Column(name = "base_faction_id")
    private UUID baseFactionId;
}

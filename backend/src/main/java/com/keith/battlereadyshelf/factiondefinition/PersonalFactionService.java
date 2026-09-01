package com.keith.battlereadyshelf.factiondefinition;

import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.ConflictException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.Faction;
import com.keith.battlereadyshelf.generated.model.UpdateFactionRequest;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionRepository;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Lets a user add factions of their own - a homebrew warband, a successor chapter - and customise
 * the shared ones for themselves, without the draft/publish workflow the admin page uses.
 *
 * <p>The admin workflow stages faction changes for review because a faction groups every model
 * definition beneath it and an unattended rename would affect everyone. Neither concern applies
 * here: a personal faction is visible only to its owner, so there is nobody to review for and
 * nothing to publish. The "diff" the UI shows compares a personal faction against the shared one it
 * was forked from.
 *
 * <p>A personal faction is an ordinary row in {@code factions} carrying an owner, so a model
 * definition points at it through the same foreign key as any other. It has no {@code externalId},
 * which is why that column had to become nullable: dataset ids belong to the shared catalogue.
 */
@Service
@RequiredArgsConstructor
public class PersonalFactionService {

    private final FactionRepository factionRepository;
    private final FactionDefinitionMapper factionDefinitionMapper;
    private final ModelDefinitionRepository modelDefinitionRepository;
    private final FactionCycleGuard factionCycleGuard;

    public List<Faction> getMyFactions(CurrentAuthenticatedUser currentUser) {
        return factionRepository.findAllByOwnerUserId(currentUser.id()).stream()
                .sorted(Comparator.comparing(FactionEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .map(factionDefinitionMapper::toDto)
                .toList();
    }

    /**
     * The shared factions themselves. The personal page needs the originals both to offer them for
     * customisation and to diff a personal copy against, and they are also the parents a personal
     * faction can sit beneath.
     */
    public List<Faction> getSharedFactions() {
        return factionRepository.findAllByOwnerUserIdIsNull().stream()
                .sorted(Comparator.comparing(FactionEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .map(factionDefinitionMapper::toDto)
                .toList();
    }

    @Transactional
    public Faction createMyFaction(CurrentAuthenticatedUser currentUser, UpdateFactionRequest request) {
        var name = requireName(request.getName());
        var parentFactionId = requireUsableParent(currentUser, request.getParentFactionId());
        requireNameFree(currentUser, name, null);

        return factionDefinitionMapper.toDto(
                factionRepository.save(
                        FactionEntity.builder()
                                .ownerUserId(currentUser.id())
                                .name(name)
                                .parentFactionId(parentFactionId)
                                .build()));
    }

    /**
     * Forks a shared faction into one owned by this user. Idempotent: a user who already customised
     * this faction gets that copy back rather than a second one, which the unique index on (owner,
     * base) enforces at the database level too.
     *
     * <p>The copy drops {@code externalId}, which belongs to the shared row the reference dataset
     * owns and is globally unique. Lineage is recorded by {@code baseFactionId} instead.
     */
    @Transactional
    public Faction customiseFaction(CurrentAuthenticatedUser currentUser, UUID factionId) {
        var existing =
                factionRepository.findByOwnerUserIdAndBaseFactionId(currentUser.id(), factionId);
        if (existing.isPresent()) {
            return factionDefinitionMapper.toDto(existing.get());
        }

        var shared =
                factionRepository
                        .findById(factionId)
                        .orElseThrow(() -> new NotFoundException("Faction not found: " + factionId));
        if (shared.getOwnerUserId() != null) {
            throw new BadRequestException(
                    "Only a shared faction can be customised; "
                            + factionId
                            + " already belongs to a user.");
        }

        return factionDefinitionMapper.toDto(
                factionRepository.save(
                        FactionEntity.builder()
                                .ownerUserId(currentUser.id())
                                .baseFactionId(shared.getId())
                                .name(shared.getName())
                                .parentFactionId(shared.getParentFactionId())
                                .build()));
    }

    @Transactional
    public Faction updateMyFaction(
            CurrentAuthenticatedUser currentUser, UUID factionId, UpdateFactionRequest request) {
        var personal = requireOwned(currentUser, factionId);
        var name = requireName(request.getName());
        var parentFactionId = requireUsableParent(currentUser, request.getParentFactionId());
        requireNameFree(currentUser, name, factionId);
        factionCycleGuard.requireNoCycle(factionId, parentFactionId);

        personal.setName(name);
        personal.setParentFactionId(parentFactionId);
        return factionDefinitionMapper.toDto(factionRepository.save(personal));
    }

    /**
     * Deletes a personal faction. For a customisation this is the "revert to the shared version"
     * action.
     *
     * <p>Refuses while any model definition still sits under it, rather than silently orphaning
     * those definitions into the ungrouped bucket.
     */
    @Transactional
    public void deleteMyFaction(CurrentAuthenticatedUser currentUser, UUID factionId) {
        requireOwned(currentUser, factionId);

        var inUseCount = modelDefinitionRepository.countByFactionId(factionId);
        if (inUseCount > 0) {
            throw new ConflictException(
                    "Cannot delete: "
                            + inUseCount
                            + " model definition(s) still belong to this faction. Move them first.");
        }
        factionRepository.deleteById(factionId);
    }

    private FactionEntity requireOwned(CurrentAuthenticatedUser currentUser, UUID factionId) {
        return factionRepository
                .findByIdAndOwnerUserId(factionId, currentUser.id())
                .orElseThrow(() -> new NotFoundException("Faction not found: " + factionId));
    }

    /**
     * A personal faction may sit beneath a shared faction or another of the user's own, but never
     * beneath someone else's. An unusable parent is reported as a plain miss so the endpoint does
     * not confirm that another user's faction exists.
     */
    private UUID requireUsableParent(CurrentAuthenticatedUser currentUser, UUID parentFactionId) {
        if (parentFactionId == null) {
            return null;
        }
        var parent =
                factionRepository
                        .findById(parentFactionId)
                        .orElseThrow(
                                () -> new NotFoundException("Faction not found: " + parentFactionId));
        if (parent.getOwnerUserId() != null && !parent.getOwnerUserId().equals(currentUser.id())) {
            throw new NotFoundException("Faction not found: " + parentFactionId);
        }
        return parentFactionId;
    }

    private static String requireName(String name) {
        var trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) {
            throw new BadRequestException("A faction needs a name.");
        }
        return trimmed;
    }

    /**
     * Rejects a name this user already uses for another of their own factions, which would be
     * indistinguishable in the faction picker. Sharing a name with a <em>shared</em> faction is
     * allowed and is exactly what customising one starts out as.
     */
    private void requireNameFree(CurrentAuthenticatedUser currentUser, String name, UUID allowedId) {
        var clash =
                factionRepository.findAllByOwnerUserId(currentUser.id()).stream()
                        .filter(faction -> faction.getName().equalsIgnoreCase(name))
                        .filter(faction -> !faction.getId().equals(allowedId))
                        .findFirst();
        if (clash.isPresent()) {
            throw new ConflictException("You already have a faction called '" + name + "'.");
        }
    }
}

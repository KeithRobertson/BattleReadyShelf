package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.ConflictException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.UpdateWargearDefinitionRequest;
import com.keith.battlereadyshelf.generated.model.WargearDefinition;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Lets a user name wargear of their own and rename the shared catalogue's wargear for themselves,
 * without the draft/publish workflow the admin page uses. As with personal model definitions there
 * is nothing to publish: the change is live for its owner immediately and invisible to everyone
 * else, and the "diff" is against the shared row it was forked from rather than a pending change.
 *
 * <p>A personal definition is an ordinary row in {@code wargear_definitions} carrying an owner, so
 * a wargear option references it through exactly the same foreign key as a shared one. Users have
 * been getting personal wargear implicitly for a while - naming wargear the catalogue doesn't have
 * creates one - so this service is mostly about making those rows visible and manageable.
 */
@Service
@RequiredArgsConstructor
public class PersonalWargearDefinitionService {

    private final WargearDefinitionRepository wargearDefinitionRepository;
    private final WargearOptionRepository wargearOptionRepository;

    public List<WargearDefinition> getMyWargearDefinitions(CurrentAuthenticatedUser currentUser) {
        var usageCounts = usageCounts();
        return wargearDefinitionRepository.findAllByOwnerUserId(currentUser.id()).stream()
                .sorted(Comparator.comparing(WargearDefinitionEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .map(entity -> toDto(entity, usageCounts))
                .toList();
    }

    /**
     * The shared wargear itself. The personal page needs the originals both to offer them for
     * customisation and to diff a personal copy against.
     */
    public List<WargearDefinition> getSharedWargearDefinitions() {
        var usageCounts = usageCounts();
        return wargearDefinitionRepository.findAllByOwnerUserIdIsNull().stream()
                .sorted(Comparator.comparing(WargearDefinitionEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .map(entity -> toDto(entity, usageCounts))
                .toList();
    }

    @Transactional
    public WargearDefinition createMyWargearDefinition(
            CurrentAuthenticatedUser currentUser, UpdateWargearDefinitionRequest request) {
        var name = requireName(request.getName());
        requireNameFree(currentUser, name, null);

        return toDto(
                wargearDefinitionRepository.save(
                        WargearDefinitionEntity.builder()
                                .ownerUserId(currentUser.id())
                                .name(name)
                                .build()));
    }

    /**
     * Forks a shared definition into one owned by this user. Idempotent: a user who already
     * customised this definition gets that copy back rather than a second one, which the unique
     * index on (owner, base) enforces at the database level too.
     *
     * <p>The copy drops {@code externalId}, which belongs to the shared row the reference dataset
     * owns and is globally unique. Lineage is recorded by {@code baseWargearDefinitionId} instead.
     *
     * <p>Note that forking does not repoint anything: the user's existing wargear options still
     * reference the shared row. The fork is a definition they can now attach going forward, and the
     * page shows how it differs from the original.
     */
    @Transactional
    public WargearDefinition customiseWargearDefinition(
            CurrentAuthenticatedUser currentUser, UUID wargearDefinitionId) {
        var existing =
                wargearDefinitionRepository.findByOwnerUserIdAndBaseWargearDefinitionId(
                        currentUser.id(), wargearDefinitionId);
        if (existing.isPresent()) {
            return toDto(existing.get());
        }

        var shared =
                wargearDefinitionRepository
                        .findById(wargearDefinitionId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Wargear definition not found: " + wargearDefinitionId));
        if (shared.getOwnerUserId() != null) {
            throw new BadRequestException(
                    "Only shared wargear can be customised; "
                            + wargearDefinitionId
                            + " already belongs to a user.");
        }

        return toDto(
                wargearDefinitionRepository.save(
                        WargearDefinitionEntity.builder()
                                .ownerUserId(currentUser.id())
                                .baseWargearDefinitionId(shared.getId())
                                .name(shared.getName())
                                .build()));
    }

    @Transactional
    public WargearDefinition updateMyWargearDefinition(
            CurrentAuthenticatedUser currentUser,
            UUID wargearDefinitionId,
            UpdateWargearDefinitionRequest request) {
        var personal = requireOwned(currentUser, wargearDefinitionId);
        var name = requireName(request.getName());
        requireNameFree(currentUser, name, wargearDefinitionId);

        personal.setName(name);
        return toDto(wargearDefinitionRepository.save(personal));
    }

    /**
     * Deletes a personal definition. For a customisation this is the "revert to the shared version"
     * action.
     *
     * <p>Refuses while any wargear option still points at it, because that foreign key is what
     * gives the option its name: dropping the definition would leave models in a collection
     * referring to wargear that no longer exists.
     */
    @Transactional
    public void deleteMyWargearDefinition(
            CurrentAuthenticatedUser currentUser, UUID wargearDefinitionId) {
        requireOwned(currentUser, wargearDefinitionId);

        var inUseCount = wargearOptionRepository.countByWargearDefinitionId(wargearDefinitionId);
        if (inUseCount > 0) {
            throw new ConflictException(
                    "Cannot delete: "
                            + inUseCount
                            + " model definition option(s) still use this wargear. Detach them"
                            + " first.");
        }
        wargearDefinitionRepository.deleteById(wargearDefinitionId);
    }

    private WargearDefinitionEntity requireOwned(
            CurrentAuthenticatedUser currentUser, UUID wargearDefinitionId) {
        return wargearDefinitionRepository
                .findByIdAndOwnerUserId(wargearDefinitionId, currentUser.id())
                .orElseThrow(
                        () ->
                                new NotFoundException(
                                        "Wargear definition not found: " + wargearDefinitionId));
    }

    private static String requireName(String name) {
        var trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) {
            throw new BadRequestException("Wargear needs a name.");
        }
        return trimmed;
    }

    /**
     * Rejects a name this user already uses. Two personal definitions with the same name would be
     * indistinguishable in the picker, and the name-based lookup that resolves wargear when a user
     * types a name would arbitrarily pick one of them.
     *
     * <p>Clashing with a <em>shared</em> name is allowed and is exactly what customising one does.
     */
    private void requireNameFree(CurrentAuthenticatedUser currentUser, String name, UUID allowedId) {
        wargearDefinitionRepository
                .findFirstByOwnerUserIdAndNameIgnoreCase(currentUser.id(), name)
                .filter(existing -> !existing.getId().equals(allowedId))
                .ifPresent(
                        existing -> {
                            throw new ConflictException("You already have wargear called '" + name + "'.");
                        });
    }

    private WargearDefinition toDto(WargearDefinitionEntity entity) {
        return toDto(
                entity,
                Map.of(
                        entity.getId(),
                        wargearOptionRepository.countByWargearDefinitionId(entity.getId())));
    }

    private WargearDefinition toDto(WargearDefinitionEntity entity, Map<UUID, Long> usageCounts) {
        return new WargearDefinition(entity.getName())
                .id(entity.getId())
                .externalId(entity.getExternalId())
                .ownerUserId(entity.getOwnerUserId())
                .baseWargearDefinitionId(entity.getBaseWargearDefinitionId())
                .usageCount(Math.toIntExact(usageCounts.getOrDefault(entity.getId(), 0L)));
    }

    /** Usage for every definition in one query, so listing a page does not fan out into a count each. */
    private Map<UUID, Long> usageCounts() {
        return wargearOptionRepository.countUsagesByWargearDefinition().stream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
    }
}

package com.keith.battlereadyshelf.hiddendefinition;

import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.generated.model.HiddenDefinitionType;

import lombok.RequiredArgsConstructor;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * What each user does not want offered to them.
 *
 * <p>A catalogue is shared by everyone but used selectively: a painter buys one brand, a player
 * collects one or two armies. Left alone a picker eventually lists hundreds of things the user will
 * never choose, so they can take any of them out of their own.
 *
 * <p>This is a preference, never a permission. Nothing is deleted, no other user is affected, and
 * anything already recorded against a model or a recipe keeps displaying - the definition lists that
 * back pickers leave hidden rows out, and everything else ignores this entirely. That is why hiding
 * needs no draft or review workflow the way editing the shared catalogue does.
 *
 * <p>Stored per type rather than polymorphically so each row has a real foreign key, which is what
 * makes a hide disappear along with the definition it pointed at.
 */
@Service
@RequiredArgsConstructor
public class HiddenDefinitionService {

    private final UserHiddenModelDefinitionRepository hiddenModelDefinitions;
    private final UserHiddenFactionRepository hiddenFactions;
    private final UserHiddenWargearDefinitionRepository hiddenWargearDefinitions;
    private final UserHiddenPaintRepository hiddenPaints;

    /** Empty for an anonymous caller: hiding is per-user, so there is nobody to have hidden anything. */
    public Set<UUID> hiddenIds(HiddenDefinitionType type, UUID userId) {
        if (userId == null) {
            return Set.of();
        }
        return switch (type) {
            case MODEL_DEFINITION -> hiddenModelDefinitions.findHiddenIdsByUserId(userId);
            case FACTION -> hiddenFactions.findHiddenIdsByUserId(userId);
            case WARGEAR_DEFINITION -> hiddenWargearDefinitions.findHiddenIdsByUserId(userId);
            case PAINT -> hiddenPaints.findHiddenIdsByUserId(userId);
        };
    }

    /** Both routes a model definition can be hidden by. See {@link HiddenModelDefinitions}. */
    public HiddenModelDefinitions hiddenModelDefinitionsFor(UUID userId) {
        if (userId == null) {
            return HiddenModelDefinitions.none();
        }
        return new HiddenModelDefinitions(
                hiddenIds(HiddenDefinitionType.MODEL_DEFINITION, userId),
                hiddenIds(HiddenDefinitionType.FACTION, userId));
    }

    /**
     * Hides or shows a set of definitions of one kind.
     *
     * <p>Idempotent in both directions, because the caller is a page acting on rows it may have
     * loaded a while ago: hiding what is already hidden and showing what was never hidden both leave
     * the list as it is rather than failing.
     */
    @Transactional
    public void setHidden(
            UUID userId, HiddenDefinitionType type, List<UUID> definitionIds, boolean hidden) {
        var ids =
                definitionIds == null
                        ? List.<UUID>of()
                        : definitionIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return;
        }

        if (hidden) {
            hide(userId, type, ids);
        } else {
            show(userId, type, ids);
        }
    }

    private void hide(UUID userId, HiddenDefinitionType type, List<UUID> ids) {
        var already = hiddenIds(type, userId);
        var toAdd = ids.stream().filter(id -> !already.contains(id)).toList();
        if (toAdd.isEmpty()) {
            return;
        }

        try {
            switch (type) {
                case MODEL_DEFINITION ->
                        hiddenModelDefinitions.saveAllAndFlush(
                                toAdd.stream()
                                        .map(
                                                id ->
                                                        UserHiddenModelDefinitionEntity.builder()
                                                                .userId(userId)
                                                                .modelDefinitionId(id)
                                                                .build())
                                        .toList());
                case FACTION ->
                        hiddenFactions.saveAllAndFlush(
                                toAdd.stream()
                                        .map(
                                                id ->
                                                        UserHiddenFactionEntity.builder()
                                                                .userId(userId)
                                                                .factionId(id)
                                                                .build())
                                        .toList());
                case WARGEAR_DEFINITION ->
                        hiddenWargearDefinitions.saveAllAndFlush(
                                toAdd.stream()
                                        .map(
                                                id ->
                                                        UserHiddenWargearDefinitionEntity.builder()
                                                                .userId(userId)
                                                                .wargearDefinitionId(id)
                                                                .build())
                                        .toList());
                case PAINT ->
                        hiddenPaints.saveAllAndFlush(
                                toAdd.stream()
                                        .map(
                                                id ->
                                                        UserHiddenPaintEntity.builder()
                                                                .userId(userId)
                                                                .paintId(id)
                                                                .build())
                                        .toList());
            }
        } catch (DataIntegrityViolationException e) {
            // Flushed above rather than left to commit so the foreign keys answer here, where an
            // unknown id can still be reported as the caller's mistake instead of a server error.
            throw new BadRequestException(
                    "Cannot hide: one of the given ids is not a " + type.getValue() + ".");
        }
    }

    private void show(UUID userId, HiddenDefinitionType type, List<UUID> ids) {
        switch (type) {
            case MODEL_DEFINITION ->
                    hiddenModelDefinitions.deleteByUserIdAndModelDefinitionIdIn(userId, ids);
            case FACTION -> hiddenFactions.deleteByUserIdAndFactionIdIn(userId, ids);
            case WARGEAR_DEFINITION ->
                    hiddenWargearDefinitions.deleteByUserIdAndWargearDefinitionIdIn(userId, ids);
            case PAINT -> hiddenPaints.deleteByUserIdAndPaintIdIn(userId, ids);
        }
    }
}

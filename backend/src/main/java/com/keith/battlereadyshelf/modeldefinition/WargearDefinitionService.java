package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.definitiondraft.Definition;
import com.keith.battlereadyshelf.definitiondraft.DefinitionPublishAuditService;
import com.keith.battlereadyshelf.definitiondraft.ProposalOrigin;
import com.keith.battlereadyshelf.definitionexport.ExportSchema;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.DefinitionPublishAudit;
import com.keith.battlereadyshelf.generated.model.WargearDefinition;
import com.keith.battlereadyshelf.generated.model.WargearDefinitionDraft;
import com.keith.battlereadyshelf.generated.model.WargearDefinitionExport;
import com.keith.battlereadyshelf.generated.model.WargearExportItem;
import com.keith.battlereadyshelf.generated.model.WargearImportResult;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Administration of the shared wargear catalogue. Because a definition is referenced rather than
 * copied, renaming one renames it on every model definition that uses it, which is the whole point
 * of storing wargear this way.
 *
 * <p>That fan-out is also why nothing renames wargear directly, whether it came from an import or
 * from an admin typing a new name: the change is staged as a {@link WargearDefinitionDraftEntity}
 * to be accepted or rejected here.
 */
@Service
@RequiredArgsConstructor
public class WargearDefinitionService {
    private final WargearDefinitionRepository wargearDefinitionRepository;
    private final WargearDefinitionDraftRepository wargearDefinitionDraftRepository;
    private final WargearOptionRepository wargearOptionRepository;
    private final DefinitionPublishAuditService definitionPublishAuditService;

    public List<WargearDefinition> getAllWargearDefinitions() {
        Map<UUID, Long> usageCounts = usageCounts();

        return wargearDefinitionRepository.findAll().stream()
                .sorted(Comparator.comparing(WargearDefinitionEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .map(definition -> toDto(definition, usageCounts.getOrDefault(definition.getId(), 0L)))
                .toList();
    }

    public List<WargearDefinitionDraft> getAllWargearDefinitionDrafts() {
        Map<UUID, Long> usageCounts = usageCounts();

        return wargearDefinitionDraftRepository.findAllByOrderByProposedNameAsc().stream()
                .map(
                        draft ->
                                toDraftDto(
                                        draft,
                                        usageCounts.getOrDefault(
                                                draft.getWargearDefinition().getId(), 0L)))
                .toList();
    }

    /**
     * Stages an admin's rename for review, or clears any pending change when the proposal matches
     * the stored name - re-proposing the current name means there is nothing to decide.
     *
     * <p>A hand edit is staged for the same reason an import's is: one definition backs every model
     * that carries the item, so the rename fans out across the catalogue either way.
     *
     * @return the staged rename, or null when the name matched and nothing needed staging
     */
    @Transactional
    public WargearDefinitionDraft proposeWargearDefinitionRename(UUID wargearDefinitionId, String name) {
        var definition =
                wargearDefinitionRepository
                        .findById(wargearDefinitionId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Wargear definition not found: " + wargearDefinitionId));

        var pending =
                reconcileName(
                        definition,
                        name,
                        wargearDefinitionDraftRepository
                                .findByWargearDefinitionId(wargearDefinitionId)
                                .orElse(null),
                        ProposalOrigin.ADMIN);

        return pending == null
                ? null
                : toDraftDto(pending, wargearOptionRepository.countByWargearDefinitionId(wargearDefinitionId));
    }

    /** Accepts a proposed rename, applying it to the definition and every model that uses it. */
    @Transactional
    public WargearDefinition publishWargearDefinitionDraft(
            CurrentAuthenticatedUser currentUser, UUID draftId) {
        var draft =
                wargearDefinitionDraftRepository
                        .findById(draftId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Wargear definition draft not found: " + draftId));

        var definition = draft.getWargearDefinition();
        var usageCount = wargearOptionRepository.countByWargearDefinitionId(definition.getId());
        var previous = toDto(definition, usageCount);

        definition.setName(draft.getProposedName());
        var saved = wargearDefinitionRepository.save(definition);
        wargearDefinitionDraftRepository.delete(draft);

        var published = toDto(saved, usageCount);
        definitionPublishAuditService.record(
                Definition.WARGEAR,
                saved.getId(),
                currentUser.id(),
                draft.getOrigin(),
                previous,
                published);

        return published;
    }

    /** Rejects a proposed rename, keeping the stored name. A later import may propose it again. */
    @Transactional
    public void discardWargearDefinitionDraft(UUID draftId) {
        var draft =
                wargearDefinitionDraftRepository
                        .findById(draftId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Wargear definition draft not found: " + draftId));
        wargearDefinitionDraftRepository.delete(draft);
    }

    public List<DefinitionPublishAudit> getPublishHistory(UUID wargearDefinitionId) {
        return definitionPublishAuditService.getHistory(Definition.WARGEAR, wargearDefinitionId);
    }

    /**
     * Exports the whole catalogue, including wargear no model definition currently uses - this is
     * the wargear page's own document, so it is not narrowed to what some other export references.
     * Emitted in source id order so an unchanged catalogue produces a byte-identical file.
     */
    public WargearDefinitionExport exportWargearDefinitions() {
        var items =
                wargearDefinitionRepository.findAll().stream()
                        .map(d -> new WargearExportItem(sourceIdOf(d), d.getName()))
                        .sorted(Comparator.comparing(WargearExportItem::getId))
                        .toList();

        return new WargearDefinitionExport(ExportSchema.CURRENT_VERSION, items)
                .exportedAt(OffsetDateTime.now(ZoneOffset.UTC));
    }

    @Transactional
    public WargearImportResult importWargearDefinitions(WargearDefinitionExport export) {
        ExportSchema.requireSupported(export.getSchemaVersion(), "wargear");

        Map<String, String> nameBySourceId = new LinkedHashMap<>();
        export.getWargear().forEach(item -> nameBySourceId.putIfAbsent(item.getId(), item.getName()));

        var outcome = upsertWargear(nameBySourceId);
        var usageCounts = usageCounts();

        return new WargearImportResult(
                outcome.created().stream()
                        .map(d -> toDto(d, usageCounts.getOrDefault(d.getId(), 0L)))
                        .toList(),
                outcome.pendingChanges().stream()
                        .map(
                                draft ->
                                        toDraftDto(
                                                draft,
                                                usageCounts.getOrDefault(
                                                        draft.getWargearDefinition().getId(), 0L)))
                        .toList(),
                outcome.unchanged());
    }

    /**
     * Resolves every named wargear id to a shared definition, creating the ones the catalogue does
     * not have yet.
     *
     * <p>An existing definition is never renamed in place by an import. One definition backs every
     * model that carries that item, so an unattended rename fans out across the catalogue and could
     * discard a correction an admin made in the app. A differing name is staged as a {@link
     * WargearDefinitionDraftEntity} for review instead, which is what lets the reference dataset
     * propose spelling fixes while leaving the final say with a human.
     */
    @Transactional
    public WargearUpsertOutcome upsertWargear(Map<String, String> nameBySourceId) {
        if (nameBySourceId.isEmpty()) {
            return WargearUpsertOutcome.empty();
        }

        var bySourceId = findBySourceIds(nameBySourceId.keySet());
        var existingDrafts =
                wargearDefinitionDraftRepository.findAllByDefinitionId(
                        bySourceId.values().stream().map(WargearDefinitionEntity::getId).toList());

        List<WargearDefinitionEntity> created = new ArrayList<>();
        List<WargearDefinitionDraftEntity> pendingChanges = new ArrayList<>();
        int unchanged = 0;

        for (var entry : nameBySourceId.entrySet()) {
            var existing = bySourceId.get(entry.getKey());
            if (existing == null) {
                var definition =
                        wargearDefinitionRepository.save(
                                WargearDefinitionEntity.builder()
                                        .externalId(entry.getKey())
                                        .name(entry.getValue())
                                        .build());
                bySourceId.put(entry.getKey(), definition);
                created.add(definition);
                continue;
            }

            var pending =
                    reconcileName(
                            existing,
                            entry.getValue(),
                            existingDrafts.get(existing.getId()),
                            ProposalOrigin.IMPORT);
            if (pending == null) {
                unchanged++;
            } else {
                pendingChanges.add(pending);
            }
        }

        return new WargearUpsertOutcome(bySourceId, created, pendingChanges, unchanged);
    }

    /**
     * Looks up wargear by stable source id without creating anything, so a document that only
     * references wargear can tell what is missing.
     *
     * <p>Hand-authored wargear has no dataset id, so exporting it emits its UUID. Re-importing that
     * document must find the original rather than treat the UUID as an unknown dataset id.
     */
    public Map<String, WargearDefinitionEntity> findBySourceIds(Collection<String> sourceIds) {
        if (sourceIds.isEmpty()) {
            return new LinkedHashMap<>();
        }

        Map<String, WargearDefinitionEntity> bySourceId =
                wargearDefinitionRepository.findAllByExternalIdIn(List.copyOf(sourceIds)).stream()
                        .collect(
                                Collectors.toMap(
                                        WargearDefinitionEntity::getExternalId,
                                        d -> d,
                                        (a, b) -> a,
                                        LinkedHashMap::new));

        sourceIds.stream()
                .filter(sourceId -> !bySourceId.containsKey(sourceId))
                .forEach(
                        sourceId ->
                                parseUuid(sourceId)
                                        .flatMap(wargearDefinitionRepository::findById)
                                        .ifPresent(existing -> bySourceId.put(sourceId, existing)));

        return bySourceId;
    }

    /**
     * Stages, refreshes or clears the pending rename for one definition, returning the pending
     * change or null when the stored name already matches.
     *
     * <p>Re-proposing an unchanged name must leave no trace, so a proposal matching the stored name
     * clears any stale pending change rather than raising a new one. That is what makes importing
     * the same document twice report nothing to review.
     */
    private WargearDefinitionDraftEntity reconcileName(
            WargearDefinitionEntity existing,
            String proposedName,
            WargearDefinitionDraftEntity pending,
            ProposalOrigin origin) {
        if (existing.getName().equals(proposedName)) {
            if (pending != null) {
                wargearDefinitionDraftRepository.delete(pending);
            }
            return null;
        }

        if (pending != null) {
            if (pending.getProposedName().equals(proposedName) && pending.getOrigin() == origin) {
                return pending;
            }
            pending.setProposedName(proposedName);
            pending.setOrigin(origin);
            return wargearDefinitionDraftRepository.save(pending);
        }

        return wargearDefinitionDraftRepository.save(
                WargearDefinitionDraftEntity.builder()
                        .wargearDefinition(existing)
                        .proposedName(proposedName)
                        .origin(origin)
                        .createdAt(Instant.now())
                        .build());
    }

    /**
     * The stable identity of a definition: its dataset id when it has one, otherwise its own UUID
     * so hand-authored wargear still round-trips through an export.
     */
    static String sourceIdOf(WargearDefinitionEntity definition) {
        return definition.getExternalId() != null
                ? definition.getExternalId()
                : definition.getId().toString();
    }

    private static Optional<UUID> parseUuid(String value) {
        try {
            return Optional.of(UUID.fromString(value));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private Map<UUID, Long> usageCounts() {
        return wargearOptionRepository.countUsagesByWargearDefinition().stream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
    }

    private WargearDefinition toDto(WargearDefinitionEntity entity, long usageCount) {
        return new WargearDefinition(entity.getName())
                .id(entity.getId())
                .externalId(entity.getExternalId())
                .usageCount(Math.toIntExact(usageCount));
    }

    private WargearDefinitionDraft toDraftDto(WargearDefinitionDraftEntity entity, long usageCount) {
        var definition = entity.getWargearDefinition();
        return new WargearDefinitionDraft(definition.getName(), entity.getProposedName())
                .id(entity.getId())
                .wargearDefinitionId(definition.getId())
                .externalId(definition.getExternalId())
                .usageCount(Math.toIntExact(usageCount))
                .origin(DefinitionPublishAuditService.toDto(entity.getOrigin()))
                .createdAt(entity.getCreatedAt().atOffset(ZoneOffset.UTC));
    }
}

package com.keith.battlereadyshelf.factiondefinition;

import static com.keith.battlereadyshelf.factiondefinition.FactionUpsertOutcome.stateOf;

import com.keith.battlereadyshelf.definitiondraft.Definition;
import com.keith.battlereadyshelf.definitiondraft.DefinitionPublishAuditService;
import com.keith.battlereadyshelf.definitiondraft.ProposalOrigin;
import com.keith.battlereadyshelf.definitionexport.ExportSchema;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.DefinitionPublishAudit;
import com.keith.battlereadyshelf.generated.model.Faction;
import com.keith.battlereadyshelf.generated.model.FactionDraft;
import com.keith.battlereadyshelf.generated.model.FactionExport;
import com.keith.battlereadyshelf.generated.model.FactionExportItem;
import com.keith.battlereadyshelf.generated.model.FactionImportResult;
import com.keith.battlereadyshelf.generated.model.UpdateFactionRequest;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionRepository;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Administration of the faction catalogue.
 *
 * <p>A faction groups every model definition beneath it, so renaming or reparenting one is not
 * applied directly, whatever proposed it: the change is staged as a {@link FactionDraftEntity} for
 * an admin to accept or reject. New factions are still created outright - there is nothing to
 * review about an addition, and staging one would leave a new faction's parent unresolvable when
 * that parent is also new.
 */
@Service
@RequiredArgsConstructor
public class FactionDefinitionService {

    private final FactionRepository factionRepository;
    private final FactionDraftRepository factionDraftRepository;
    private final FactionDefinitionMapper factionDefinitionMapper;
    private final ModelDefinitionRepository modelDefinitionRepository;
    private final DefinitionPublishAuditService definitionPublishAuditService;

    /** Lists all factions, for admin tooling such as grouping model definitions by faction. */
    public List<Faction> getAllFactions() {
        return factionRepository.findAll().stream().map(factionDefinitionMapper::toDto).toList();
    }

    public Faction createFaction(Faction faction) {
        return factionDefinitionMapper.toDto(
                factionRepository.save(factionDefinitionMapper.toEntity(faction)));
    }

    public void deleteFaction(UUID factionId) {
        factionRepository.deleteById(factionId);
    }

    public List<FactionDraft> getAllFactionDrafts() {
        var counts = modelDefinitionCounts();
        return factionDraftRepository.findAllByOrderByProposedNameAsc().stream()
                .map(draft -> toDraftDto(draft, counts))
                .toList();
    }

    /**
     * Stages an admin's change for review, or clears any pending change when the proposal matches
     * what is already stored - re-proposing the current state means there is nothing to decide.
     *
     * @return the staged change, or null when the proposal matched and nothing needed staging
     */
    @Transactional
    public FactionDraft proposeFactionChange(UUID factionId, UpdateFactionRequest request) {
        var faction =
                factionRepository
                        .findById(factionId)
                        .orElseThrow(() -> new NotFoundException("Faction not found: " + factionId));

        requireNoCycle(faction.getId(), request.getParentFactionId());

        var pending =
                reconcile(
                        faction,
                        request.getName(),
                        request.getParentFactionId(),
                        factionDraftRepository.findByFactionId(factionId).orElse(null),
                        ProposalOrigin.ADMIN);

        return pending == null ? null : toDraftDto(pending, modelDefinitionCounts());
    }

    /** Accepts a pending change, applying it and recording an audit entry. */
    @Transactional
    public Faction publishFactionDraft(CurrentAuthenticatedUser currentUser, UUID draftId) {
        var draft =
                factionDraftRepository
                        .findById(draftId)
                        .orElseThrow(
                                () -> new NotFoundException("Faction draft not found: " + draftId));

        var faction = draft.getFaction();
        requireNoCycle(faction.getId(), draft.getProposedParentFactionId());

        var previous = factionDefinitionMapper.toDto(faction);
        faction.setName(draft.getProposedName());
        faction.setParentFactionId(draft.getProposedParentFactionId());
        var saved = factionRepository.save(faction);
        factionDraftRepository.delete(draft);

        var published = factionDefinitionMapper.toDto(saved);
        definitionPublishAuditService.record(
                Definition.FACTION,
                saved.getId(),
                currentUser.id(),
                draft.getOrigin(),
                previous,
                published);

        return published;
    }

    /** Rejects a pending change, keeping the stored state. A later import may propose it again. */
    @Transactional
    public void discardFactionDraft(UUID draftId) {
        var draft =
                factionDraftRepository
                        .findById(draftId)
                        .orElseThrow(
                                () -> new NotFoundException("Faction draft not found: " + draftId));
        factionDraftRepository.delete(draft);
    }

    public List<DefinitionPublishAudit> getPublishHistory(UUID factionId) {
        return definitionPublishAuditService.getHistory(Definition.FACTION, factionId);
    }

    /**
     * Exports every faction as a portable document. Emitted in source id order so an unchanged
     * catalogue always produces a byte-identical file.
     *
     * <p>Pending changes are deliberately not exported: the document describes what the catalogue
     * currently is, not what someone has proposed it should become.
     */
    public FactionExport exportFactions() {
        var factions = factionRepository.findAll();
        Map<UUID, String> sourceIdById =
                factions.stream()
                        .collect(Collectors.toMap(FactionEntity::getId, FactionEntity::getExternalId));

        var items =
                factions.stream()
                        .map(
                                f ->
                                        new FactionExportItem(f.getExternalId(), f.getName())
                                                .parentFactionId(
                                                        f.getParentFactionId() == null
                                                                ? null
                                                                : sourceIdById.get(f.getParentFactionId())))
                        .sorted(Comparator.comparing(FactionExportItem::getId))
                        .toList();

        return new FactionExport(ExportSchema.CURRENT_VERSION, items)
                .exportedAt(OffsetDateTime.now(ZoneOffset.UTC));
    }

    @Transactional
    public FactionImportResult importFactions(FactionExport export) {
        ExportSchema.requireSupported(export.getSchemaVersion(), "faction");
        var outcome = upsertFactions(export.getFactions());
        var counts = modelDefinitionCounts();

        return new FactionImportResult(
                outcome.created().stream().map(factionDefinitionMapper::toDto).toList(),
                outcome.pendingChanges().stream().map(draft -> toDraftDto(draft, counts)).toList(),
                outcome.unchanged());
    }

    /**
     * Upserts factions matched by source 'id'. Factions the catalogue does not have are created
     * outright; changes to existing ones are staged for review. Parent links are resolved in a
     * second pass so ordering within the document does not matter.
     *
     * <p>The document is authoritative for a faction it names, so a parent link it omits is
     * proposed as a clearing rather than ignored - but that too only takes effect once accepted.
     */
    @Transactional
    public FactionUpsertOutcome upsertFactions(List<FactionExportItem> factionItems) {
        if (factionItems == null || factionItems.isEmpty()) {
            return FactionUpsertOutcome.empty();
        }

        var existingByExternalId =
                factionRepository.findAll().stream()
                        .collect(Collectors.toMap(FactionEntity::getExternalId, f -> f, (a, b) -> a));

        Map<String, FactionEntity> bySourceId = new LinkedHashMap<>();
        List<FactionEntity> created = new ArrayList<>();

        for (var item : factionItems) {
            var existing = existingByExternalId.get(item.getId());
            if (existing == null) {
                // Saved up front so a child in this same document can resolve its parent.
                var newFaction =
                        factionRepository.save(
                                FactionEntity.builder()
                                        .externalId(item.getId())
                                        .name(item.getName())
                                        .build());
                bySourceId.put(item.getId(), newFaction);
                created.add(newFaction);
            } else {
                bySourceId.put(item.getId(), existing);
            }
        }

        var proposedParents = resolveProposedParents(factionItems, bySourceId);

        // A new faction is applied rather than staged, so its parent link is set directly. Only
        // links on pre-existing factions go through review.
        for (var newFaction : created) {
            newFaction.setParentFactionId(proposedParents.get(newFaction.getExternalId()));
            factionRepository.save(newFaction);
        }

        var createdIds = created.stream().map(FactionEntity::getId).collect(Collectors.toSet());
        var existingDrafts =
                factionDraftRepository.findAllByFactionId(
                        bySourceId.values().stream()
                                .map(FactionEntity::getId)
                                .filter(id -> !createdIds.contains(id))
                                .toList());

        List<FactionDraftEntity> pendingChanges = new ArrayList<>();
        int unchanged = 0;
        for (var item : factionItems) {
            var faction = bySourceId.get(item.getId());
            if (createdIds.contains(faction.getId())) {
                continue;
            }
            var pending =
                    reconcile(
                            faction,
                            item.getName(),
                            proposedParents.get(item.getId()),
                            existingDrafts.get(faction.getId()),
                            ProposalOrigin.IMPORT);
            if (pending == null) {
                unchanged++;
            } else {
                pendingChanges.add(pending);
            }
        }

        return new FactionUpsertOutcome(bySourceId, created, pendingChanges, unchanged);
    }

    /**
     * Stages, refreshes or clears the pending change for one faction, returning the pending change
     * or null when the stored state already matches.
     *
     * <p>Re-proposing an unchanged state must leave no trace, so a proposal matching what is stored
     * clears any stale pending change rather than raising a new one. That is what makes importing
     * the same document twice report nothing to review.
     */
    private FactionDraftEntity reconcile(
            FactionEntity faction,
            String proposedName,
            UUID proposedParentFactionId,
            FactionDraftEntity pending,
            ProposalOrigin origin) {
        var proposed = stateOf(proposedName, proposedParentFactionId);

        if (stateOf(faction).equals(proposed)) {
            if (pending != null) {
                factionDraftRepository.delete(pending);
            }
            return null;
        }

        if (pending == null) {
            return factionDraftRepository.save(
                    FactionDraftEntity.builder()
                            .faction(faction)
                            .proposedName(proposedName)
                            .proposedParentFactionId(proposedParentFactionId)
                            .origin(origin)
                            .createdAt(Instant.now())
                            .build());
        }

        if (stateOf(pending.getProposedName(), pending.getProposedParentFactionId()).equals(proposed)) {
            return pending;
        }

        pending.setProposedName(proposedName);
        pending.setProposedParentFactionId(proposedParentFactionId);
        pending.setOrigin(origin);
        return factionDraftRepository.save(pending);
    }

    /** Maps each item's source id to the persisted id of the parent it names, if any. */
    private Map<String, UUID> resolveProposedParents(
            List<FactionExportItem> factionItems, Map<String, FactionEntity> bySourceId) {
        Map<String, UUID> proposedParents = new HashMap<>();
        for (var item : factionItems) {
            if (item.getParentFactionId() == null) {
                continue;
            }
            var parent = bySourceId.get(item.getParentFactionId());
            if (parent == null) {
                throw new BadRequestException(
                        "Faction '"
                                + item.getId()
                                + "' references unknown parent faction id '"
                                + item.getParentFactionId()
                                + "'. A parent must be defined in the same document.");
            }
            proposedParents.put(item.getId(), parent.getId());
        }
        return proposedParents;
    }

    /**
     * Rejects a parent that is the faction itself or one of its descendants. Reparenting by hand is
     * newly possible, so a cycle is reachable for the first time and would loop forever when
     * walking the hierarchy.
     */
    private void requireNoCycle(UUID factionId, UUID proposedParentFactionId) {
        if (proposedParentFactionId == null) {
            return;
        }
        if (proposedParentFactionId.equals(factionId)) {
            throw new BadRequestException("A faction cannot be its own parent.");
        }

        Map<UUID, UUID> parentById =
                factionRepository.findAll().stream()
                        .filter(f -> f.getParentFactionId() != null)
                        .collect(Collectors.toMap(FactionEntity::getId, FactionEntity::getParentFactionId));

        var seen = new HashSet<UUID>();
        var ancestor = proposedParentFactionId;
        while (ancestor != null && seen.add(ancestor)) {
            if (ancestor.equals(factionId)) {
                throw new BadRequestException(
                        "That faction is already beneath this one, so it cannot also be its parent.");
            }
            ancestor = parentById.get(ancestor);
        }
    }

    private Map<UUID, Long> modelDefinitionCounts() {
        return modelDefinitionRepository.countByFaction().stream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
    }

    private FactionDraft toDraftDto(FactionDraftEntity entity, Map<UUID, Long> counts) {
        var faction = entity.getFaction();
        return new FactionDraft(faction.getName(), entity.getProposedName())
                .id(entity.getId())
                .factionId(faction.getId())
                .externalId(faction.getExternalId())
                .currentParentFactionId(faction.getParentFactionId())
                .proposedParentFactionId(entity.getProposedParentFactionId())
                .usageCount(Math.toIntExact(counts.getOrDefault(faction.getId(), 0L)))
                .origin(DefinitionPublishAuditService.toDto(entity.getOrigin()))
                .createdAt(entity.getCreatedAt().atOffset(ZoneOffset.UTC));
    }
}

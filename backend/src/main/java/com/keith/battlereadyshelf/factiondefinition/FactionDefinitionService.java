package com.keith.battlereadyshelf.factiondefinition;

import static com.keith.battlereadyshelf.factiondefinition.FactionUpsertOutcome.stateOf;

import com.keith.battlereadyshelf.definitionexport.ExportSchema;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.generated.model.Faction;
import com.keith.battlereadyshelf.generated.model.FactionExport;
import com.keith.battlereadyshelf.generated.model.FactionExportItem;
import com.keith.battlereadyshelf.generated.model.FactionImportResult;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FactionDefinitionService {

    private final FactionRepository factionRepository;
    private final FactionDefinitionMapper factionDefinitionMapper;

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

    /**
     * Exports every faction as a portable document. Emitted in source id order so an unchanged
     * catalogue always produces a byte-identical file.
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

        return new FactionImportResult(
                outcome.created().stream().map(factionDefinitionMapper::toDto).toList(),
                outcome.updated().stream().map(factionDefinitionMapper::toDto).toList(),
                outcome.unchanged());
    }

    /**
     * Upserts factions (matched by source 'id') directly onto the published table - factions are
     * simple reference/categorisation data with no draft/publish workflow. Parent links are
     * resolved in a second pass so ordering within the document does not matter.
     *
     * <p>The document is authoritative for a faction it names: a parent link it omits is cleared.
     * Anything already matching is left untouched, which is what makes a re-import a no-op.
     */
    @Transactional
    public FactionUpsertOutcome upsertFactions(List<FactionExportItem> factionItems) {
        if (factionItems == null || factionItems.isEmpty()) {
            return FactionUpsertOutcome.empty();
        }

        var existingByExternalId =
                factionRepository.findAll().stream()
                        .collect(Collectors.toMap(FactionEntity::getExternalId, f -> f, (a, b) -> a));

        // Captured before anything is mutated, so the save pass can tell a genuine change from a
        // re-import of the same document.
        Map<String, String> originalState = new HashMap<>();
        Map<String, FactionEntity> bySourceId = new LinkedHashMap<>();

        for (var item : factionItems) {
            var existing = existingByExternalId.get(item.getId());
            if (existing == null) {
                // Saved up front purely so a child in this same document can link to its id.
                bySourceId.put(
                        item.getId(),
                        factionRepository.save(
                                FactionEntity.builder()
                                        .externalId(item.getId())
                                        .name(item.getName())
                                        .build()));
                continue;
            }
            originalState.put(item.getId(), stateOf(existing));
            existing.setName(item.getName());
            bySourceId.put(item.getId(), existing);
        }

        applyParentLinks(factionItems, bySourceId);

        List<FactionEntity> created = new ArrayList<>();
        List<FactionEntity> updated = new ArrayList<>();
        int unchanged = 0;
        for (var item : factionItems) {
            var faction = bySourceId.get(item.getId());
            var original = originalState.get(item.getId());
            if (original == null) {
                created.add(factionRepository.save(faction));
            } else if (original.equals(stateOf(faction))) {
                unchanged++;
            } else {
                updated.add(factionRepository.save(faction));
            }
        }

        return new FactionUpsertOutcome(bySourceId, created, updated, unchanged);
    }

    private void applyParentLinks(
            List<FactionExportItem> factionItems, Map<String, FactionEntity> bySourceId) {
        for (var item : factionItems) {
            var faction = bySourceId.get(item.getId());
            if (item.getParentFactionId() == null) {
                faction.setParentFactionId(null);
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
            faction.setParentFactionId(parent.getId());
        }
    }
}

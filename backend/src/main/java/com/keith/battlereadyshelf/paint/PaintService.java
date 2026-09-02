package com.keith.battlereadyshelf.paint;

import static com.keith.battlereadyshelf.paint.PaintMapper.BY_BRAND_THEN_NAME;
import static com.keith.battlereadyshelf.paint.PaintMapper.normaliseHexColour;
import static com.keith.battlereadyshelf.paint.PaintMapper.requireName;
import static com.keith.battlereadyshelf.paint.PaintMapper.trimToNull;

import com.keith.battlereadyshelf.definitiondraft.Definition;
import com.keith.battlereadyshelf.definitiondraft.DefinitionPublishAuditService;
import com.keith.battlereadyshelf.definitiondraft.ProposalOrigin;
import com.keith.battlereadyshelf.definitionexport.ExportSchema;
import com.keith.battlereadyshelf.error.ConflictException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.DefinitionPublishAudit;
import com.keith.battlereadyshelf.generated.model.Paint;
import com.keith.battlereadyshelf.generated.model.PaintDraft;
import com.keith.battlereadyshelf.generated.model.PaintExport;
import com.keith.battlereadyshelf.generated.model.PaintExportItem;
import com.keith.battlereadyshelf.generated.model.PaintImportResult;
import com.keith.battlereadyshelf.generated.model.UpdatePaintRequest;
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
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Administration of the shared paint catalogue.
 *
 * <p>Because a recipe references a paint rather than copying its name, editing one catalogue row
 * changes every recipe that uses it, in every user's collection. That fan-out is why nothing here
 * edits a paint directly: the change is staged as a {@link PaintDraftEntity} to be accepted or
 * rejected, exactly as for factions and wargear.
 *
 * <p>Creating and deleting are not staged. A paint nobody references yet cannot surprise anyone,
 * and deletion is refused outright while anything still points at it.
 */
@Service
@RequiredArgsConstructor
public class PaintService {

    private final PaintRepository paintRepository;
    private final PaintDraftRepository paintDraftRepository;
    private final PaintRecipeRepository paintRecipeRepository;
    private final DefinitionPublishAuditService definitionPublishAuditService;

    /** The shared catalogue alone. A user's own paints are never administered here. */
    public List<Paint> getSharedPaints() {
        var usageCounts = usageCounts();
        return paintRepository.findAllByOwnerUserIdIsNull().stream()
                .sorted(BY_BRAND_THEN_NAME)
                .map(paint -> PaintMapper.toDto(paint, usageCounts))
                .toList();
    }

    @Transactional
    public Paint createPaint(UpdatePaintRequest request) {
        var name = requireName(request.getName());
        var brand = trimToNull(request.getBrand());
        requireCatalogueSlotFree(name, brand, null);

        return PaintMapper.toDto(
                paintRepository.save(
                        PaintEntity.builder()
                                .name(name)
                                .brand(brand)
                                .paintType(PaintMapper.fromDto(request.getPaintType()))
                                .hexColour(normaliseHexColour(request.getHexColour()))
                                .build()),
                0L);
    }

    public List<PaintDraft> getAllPaintDrafts() {
        var usageCounts = usageCounts();
        return paintDraftRepository.findAllByOrderByProposedNameAsc().stream()
                .map(draft -> toDraftDto(draft, usageCounts))
                .toList();
    }

    /**
     * Stages an admin's edit for review, or clears any pending change when the proposal matches
     * what is already stored - re-proposing the current state means there is nothing to decide.
     *
     * @return the staged change, or null when nothing needed staging
     */
    @Transactional
    public PaintDraft proposePaintChange(UUID paintId, UpdatePaintRequest request) {
        var paint = requireCataloguePaint(paintId);
        var name = requireName(request.getName());
        var brand = trimToNull(request.getBrand());
        requireCatalogueSlotFree(name, brand, paintId);

        var pending =
                reconcile(
                        paint,
                        name,
                        brand,
                        PaintMapper.fromDto(request.getPaintType()),
                        normaliseHexColour(request.getHexColour()),
                        paintDraftRepository.findByPaintId(paintId).orElse(null),
                        ProposalOrigin.ADMIN);

        return pending == null
                ? null
                : toDraftDto(pending, Map.of(paintId, paintRecipeRepository.countUsagesOfPaint(paintId)));
    }

    /** Accepts a proposed change, applying it to the catalogue and every recipe that uses it. */
    @Transactional
    public Paint publishPaintDraft(CurrentAuthenticatedUser currentUser, UUID draftId) {
        var draft = requireDraft(draftId);
        var paint = draft.getPaint();
        var usageCount = paintRecipeRepository.countUsagesOfPaint(paint.getId());
        var previous = PaintMapper.toDto(paint, usageCount);

        paint.setName(draft.getProposedName());
        paint.setBrand(draft.getProposedBrand());
        paint.setPaintType(draft.getProposedPaintType());
        paint.setHexColour(draft.getProposedHexColour());
        var saved = paintRepository.save(paint);
        paintDraftRepository.delete(draft);

        var published = PaintMapper.toDto(saved, usageCount);
        definitionPublishAuditService.record(
                Definition.PAINT,
                saved.getId(),
                currentUser.id(),
                draft.getOrigin(),
                previous,
                published);

        return published;
    }

    /** Rejects a proposed change, keeping the stored state. */
    @Transactional
    public void discardPaintDraft(UUID draftId) {
        paintDraftRepository.delete(requireDraft(draftId));
    }

    /**
     * Removes a paint from the catalogue.
     *
     * <p>Refused while any recipe still names it, because deleting it would quietly rewrite what
     * users recorded about their own models. Also refused while someone holds a customisation of
     * it, which would otherwise be orphaned from the paint it was forked from.
     */
    @Transactional
    public void deletePaint(UUID paintId) {
        requireCataloguePaint(paintId);

        var inUseCount = paintRecipeRepository.countUsagesOfPaint(paintId);
        if (inUseCount > 0) {
            throw new ConflictException(
                    "Cannot delete: " + inUseCount + " paint recipe entr(ies) still use this paint.");
        }
        if (paintRepository.existsByBasePaintId(paintId)) {
            throw new ConflictException(
                    "Cannot delete: users have customised this paint. Their copies would be left"
                            + " without an original.");
        }

        paintDraftRepository.findByPaintId(paintId).ifPresent(paintDraftRepository::delete);
        paintRepository.deleteById(paintId);
    }

    public List<DefinitionPublishAudit> getPublishHistory(UUID paintId) {
        return definitionPublishAuditService.getHistory(Definition.PAINT, paintId);
    }

    /**
     * Exports the whole catalogue, including paints no recipe currently uses. Emitted in source id
     * order so an unchanged catalogue produces a byte-identical file.
     */
    public PaintExport exportPaints() {
        var items =
                paintRepository.findAllByOwnerUserIdIsNull().stream()
                        .map(
                                paint ->
                                        new PaintExportItem(sourceIdOf(paint), paint.getName())
                                                .brand(paint.getBrand())
                                                .paintType(PaintMapper.toDto(paint.getPaintType()))
                                                .hexColour(paint.getHexColour()))
                        .sorted(Comparator.comparing(PaintExportItem::getId))
                        .toList();

        return new PaintExport(ExportSchema.CURRENT_VERSION, items)
                .exportedAt(OffsetDateTime.now(ZoneOffset.UTC));
    }

    /**
     * Applies a paint document, creating what the catalogue is missing and staging the rest.
     *
     * <p>An existing paint is never edited in place by an import, for the same reason an admin's
     * own edit is staged: one row backs every recipe that names the paint, across every user's
     * collections, so an unattended change fans out and could discard a correction made in the app.
     * A differing entry becomes a {@link PaintDraftEntity} for review, which is what lets the
     * reference dataset propose corrections while leaving the final say with a human.
     */
    @Transactional
    public PaintImportResult importPaints(PaintExport export) {
        ExportSchema.requireSupported(export.getSchemaVersion(), "paint");

        // Later duplicates of one source id are dropped rather than fighting each other: two
        // entries claiming the same paint would otherwise each stage a change undoing the other.
        Map<String, PaintExportItem> bySourceId = new LinkedHashMap<>();
        export.getPaints().forEach(item -> bySourceId.putIfAbsent(item.getId(), item));

        var existingBySourceId = findBySourceIds(bySourceId.keySet());
        var existingDrafts =
                paintDraftRepository
                        .findAllByPaintIdIn(
                                existingBySourceId.values().stream().map(PaintEntity::getId).toList())
                        .stream()
                        .collect(Collectors.toMap(draft -> draft.getPaint().getId(), draft -> draft));

        List<PaintEntity> created = new ArrayList<>();
        List<PaintDraftEntity> pendingChanges = new ArrayList<>();
        int unchanged = 0;

        for (var entry : bySourceId.entrySet()) {
            var item = entry.getValue();
            var name = requireName(item.getName());
            var brand = trimToNull(item.getBrand());
            var paintType = PaintMapper.fromDto(item.getPaintType());
            var hexColour = normaliseHexColour(item.getHexColour());

            var existing = existingBySourceId.get(entry.getKey());
            if (existing == null) {
                requireCatalogueSlotFree(name, brand, null);
                created.add(
                        paintRepository.save(
                                PaintEntity.builder()
                                        // Only a dataset id is recorded as such; a document
                                        // exported from hand-authored paints carries their UUIDs,
                                        // which are matched above but must not be stored as if they
                                        // came from a dataset.
                                        .externalId(isUuid(entry.getKey()) ? null : entry.getKey())
                                        .name(name)
                                        .brand(brand)
                                        .paintType(paintType)
                                        .hexColour(hexColour)
                                        .build()));
                continue;
            }

            var pending =
                    reconcile(
                            existing,
                            name,
                            brand,
                            paintType,
                            hexColour,
                            existingDrafts.get(existing.getId()),
                            ProposalOrigin.IMPORT);
            if (pending == null) {
                unchanged++;
            } else {
                pendingChanges.add(pending);
            }
        }

        var usageCounts = usageCounts();
        return new PaintImportResult(
                created.stream().map(paint -> PaintMapper.toDto(paint, usageCounts)).toList(),
                pendingChanges.stream().map(draft -> toDraftDto(draft, usageCounts)).toList(),
                unchanged);
    }

    /**
     * Looks up catalogue paints by stable source id without creating anything.
     *
     * <p>A hand-authored paint has no dataset id, so exporting it emits its UUID. Re-importing that
     * document must find the original rather than treat the UUID as an unknown dataset id and add a
     * duplicate.
     */
    private Map<String, PaintEntity> findBySourceIds(Collection<String> sourceIds) {
        if (sourceIds.isEmpty()) {
            return new LinkedHashMap<>();
        }

        Map<String, PaintEntity> bySourceId =
                paintRepository
                        .findAllByOwnerUserIdIsNullAndExternalIdIn(List.copyOf(sourceIds))
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        PaintEntity::getExternalId,
                                        paint -> paint,
                                        (a, b) -> a,
                                        LinkedHashMap::new));

        sourceIds.stream()
                .filter(sourceId -> !bySourceId.containsKey(sourceId))
                .forEach(
                        sourceId ->
                                parseUuid(sourceId)
                                        .flatMap(paintRepository::findById)
                                        // A personal paint sharing an id is not catalogue data and
                                        // must not be edited by an admin import.
                                        .filter(paint -> paint.getOwnerUserId() == null)
                                        .ifPresent(paint -> bySourceId.put(sourceId, paint)));

        return bySourceId;
    }

    /**
     * The stable identity of a paint: its dataset id when it has one, otherwise its own UUID so a
     * hand-authored paint still round-trips through an export.
     */
    private static String sourceIdOf(PaintEntity paint) {
        return paint.getExternalId() != null ? paint.getExternalId() : paint.getId().toString();
    }

    private static boolean isUuid(String value) {
        return parseUuid(value).isPresent();
    }

    private static Optional<UUID> parseUuid(String value) {
        try {
            return Optional.of(UUID.fromString(value));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /**
     * Stages, refreshes or clears the pending change for one paint, returning it or null when the
     * stored state already matches.
     *
     * <p>Re-proposing an unchanged state must leave no trace, so a proposal equal to what is stored
     * clears any stale pending change rather than raising a new one.
     */
    private PaintDraftEntity reconcile(
            PaintEntity paint,
            String proposedName,
            String proposedBrand,
            PaintType proposedPaintType,
            String proposedHexColour,
            PaintDraftEntity pending,
            ProposalOrigin origin) {
        var unchanged =
                Objects.equals(paint.getName(), proposedName)
                        && Objects.equals(paint.getBrand(), proposedBrand)
                        && paint.getPaintType() == proposedPaintType
                        && Objects.equals(paint.getHexColour(), proposedHexColour);
        if (unchanged) {
            if (pending != null) {
                paintDraftRepository.delete(pending);
            }
            return null;
        }

        var draft =
                pending != null
                        ? pending
                        : PaintDraftEntity.builder().paint(paint).createdAt(Instant.now()).build();
        draft.setProposedName(proposedName);
        draft.setProposedBrand(proposedBrand);
        draft.setProposedPaintType(proposedPaintType);
        draft.setProposedHexColour(proposedHexColour);
        draft.setOrigin(origin);
        return paintDraftRepository.save(draft);
    }

    private PaintEntity requireCataloguePaint(UUID paintId) {
        var paint =
                paintRepository
                        .findById(paintId)
                        .orElseThrow(() -> new NotFoundException("Paint not found: " + paintId));
        if (paint.getOwnerUserId() != null) {
            throw new NotFoundException("Paint not found: " + paintId);
        }
        return paint;
    }

    private PaintDraftEntity requireDraft(UUID draftId) {
        return paintDraftRepository
                .findById(draftId)
                .orElseThrow(() -> new NotFoundException("Paint draft not found: " + draftId));
    }

    /**
     * Rejects a brand and name the catalogue already uses. Two identical entries would be
     * indistinguishable in the picker, and there would be no way to tell which one a recipe meant.
     */
    private void requireCatalogueSlotFree(String name, String brand, UUID allowedId) {
        paintRepository
                .findClash(null, name, brand)
                .filter(existing -> !existing.getId().equals(allowedId))
                .ifPresent(
                        existing -> {
                            throw new ConflictException(
                                    "The catalogue already has a paint called '"
                                            + name
                                            + "'"
                                            + (brand == null ? "" : " by " + brand)
                                            + ".");
                        });
    }

    private Map<UUID, Long> usageCounts() {
        return paintRecipeRepository.countUsagesByPaint().stream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
    }

    private PaintDraft toDraftDto(PaintDraftEntity entity, Map<UUID, Long> usageCounts) {
        var paint = entity.getPaint();
        return new PaintDraft(paint.getName(), entity.getProposedName())
                .id(entity.getId())
                .paintId(paint.getId())
                .externalId(paint.getExternalId())
                .currentBrand(paint.getBrand())
                .proposedBrand(entity.getProposedBrand())
                .currentPaintType(PaintMapper.toDto(paint.getPaintType()))
                .proposedPaintType(PaintMapper.toDto(entity.getProposedPaintType()))
                .currentHexColour(paint.getHexColour())
                .proposedHexColour(entity.getProposedHexColour())
                .usageCount(Math.toIntExact(usageCounts.getOrDefault(paint.getId(), 0L)))
                .origin(DefinitionPublishAuditService.toDto(entity.getOrigin()))
                .createdAt(entity.getCreatedAt().atOffset(ZoneOffset.UTC));
    }
}

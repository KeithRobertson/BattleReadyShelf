package com.keith.battlereadyshelf.modeldefinition;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keith.battlereadyshelf.definitionexport.ExportSchema;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.factiondefinition.FactionDefinitionService;
import com.keith.battlereadyshelf.factiondefinition.FactionEntity;
import com.keith.battlereadyshelf.factiondefinition.FactionRepository;
import com.keith.battlereadyshelf.generated.model.AttachmentSlotDraft;
import com.keith.battlereadyshelf.generated.model.FactionExportItem;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionDraft;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExport;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExportItem;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExportItemAttachmentSlotsInner;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExportItemWargearOptionsInner;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionPublishAuditEntry;
import com.keith.battlereadyshelf.generated.model.UpsertAttachmentSlotDraftRequest;
import com.keith.battlereadyshelf.generated.model.UpsertModelDefinitionDraftRequest;
import com.keith.battlereadyshelf.generated.model.UpsertWargearOptionDraftRequest;
import com.keith.battlereadyshelf.generated.model.WargearExportItem;
import com.keith.battlereadyshelf.generated.model.WargearOptionDraft;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;

import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Manages the admin draft/publish/audit workflow for {@link ModelDefinitionEntity model
 * definitions}: admins edit {@link ModelDefinitionDraftEntity drafts} until they publish them,
 * at which point the draft's data is upserted onto the published tables (preserving existing ids
 * so references from user data are not broken) and an immutable audit entry is recorded.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ModelDefinitionDraftService {
    private final ModelDefinitionRepository modelDefinitionRepository;
    private final AttachmentSlotRepository attachmentSlotRepository;
    private final WargearOptionRepository wargearOptionRepository;
    private final WargearDefinitionRepository wargearDefinitionRepository;
    private final WargearDefinitionService wargearDefinitionService;
    private final FactionRepository factionRepository;
    private final FactionDefinitionService factionDefinitionService;
    private final ModelDefinitionDraftRepository modelDefinitionDraftRepository;
    private final AttachmentSlotDraftRepository attachmentSlotDraftRepository;
    private final WargearOptionDraftRepository wargearOptionDraftRepository;
    private final ModelDefinitionPublishAuditRepository modelDefinitionPublishAuditRepository;
    private final ModelDefinitionMapper modelDefinitionMapper;
    private final ObjectMapper objectMapper;

    public List<ModelDefinitionDraft> getAllDrafts() {
        return withChildren(modelDefinitionDraftRepository.findAll());
    }

    public ModelDefinitionDraft getDraft(UUID draftId) {
        return toDraftDto(requireDraft(draftId));
    }

    @Transactional
    public ModelDefinitionDraft createDraft(
            CurrentAuthenticatedUser currentUser, UpsertModelDefinitionDraftRequest request) {
        var draft =
                modelDefinitionDraftRepository.save(
                        ModelDefinitionDraftEntity.builder()
                                .name(request.getName())
                                .description(request.getDescription())
                                .createdBy(currentUser.id())
                                .updatedBy(currentUser.id())
                                .build());
        applyChildren(draft.getId(), request);
        return toDraftDto(draft);
    }

    /**
     * Starts editing a published model definition, seeding a new draft from its current
     * published state, or returns the already-open draft for it if one exists.
     */
    @Transactional
    public ModelDefinitionDraft startDraft(CurrentAuthenticatedUser currentUser, UUID modelDefinitionId) {
        return toDraftDto(startOrGetDraftEntity(currentUser, modelDefinitionId));
    }

    /**
     * Shared implementation behind {@link #startDraft}, returning the entity rather than its DTO
     * so {@link #importItem} can call it directly (as a plain, non-transactional private method)
     * instead of going through {@code this.startDraft(...)}. Self-invoking an {@code @Transactional}
     * method bypasses Spring's proxy and would silently skip the annotation; calling this private
     * helper avoids that pitfall while still running inside whatever transaction the caller
     * (either the proxied {@link #startDraft} or {@link #importModelDefinitions}) already opened.
     */
    private ModelDefinitionDraftEntity startOrGetDraftEntity(
            CurrentAuthenticatedUser currentUser, UUID modelDefinitionId) {
        var existingDraft =
                modelDefinitionDraftRepository.findByPublishedModelDefinitionId(modelDefinitionId);
        if (existingDraft.isPresent()) {
            return existingDraft.get();
        }

        var published =
                modelDefinitionRepository
                        .findById(modelDefinitionId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Model definition not found: " + modelDefinitionId));

        var draft =
                modelDefinitionDraftRepository.save(
                        ModelDefinitionDraftEntity.builder()
                                .publishedModelDefinitionId(modelDefinitionId)
                                .externalId(published.getExternalId())
                                .factionId(published.getFactionId())
                                .name(published.getName())
                                .description(published.getDescription())
                                .createdBy(currentUser.id())
                                .updatedBy(currentUser.id())
                                .build());

        var publishedSlots = attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(modelDefinitionId));
        var publishedOptions = wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(modelDefinitionId));

        Map<UUID, AttachmentSlotDraftEntity> draftSlotByPublishedSlotId = new HashMap<>();
        for (var slot : publishedSlots) {
            var draftSlot =
                    attachmentSlotDraftRepository.save(
                            AttachmentSlotDraftEntity.builder()
                                    .modelDefinitionDraftId(draft.getId())
                                    .publishedAttachmentSlotId(slot.getId())
                                    .externalId(slot.getExternalId())
                                    .name(slot.getName())
                                    .type(slot.getType())
                                    .build());
            draftSlotByPublishedSlotId.put(slot.getId(), draftSlot);
        }

        for (var option : publishedOptions) {
            var draftOption =
                    WargearOptionDraftEntity.builder()
                            .modelDefinitionDraftId(draft.getId())
                            .publishedWargearOptionId(option.getId())
                            .wargearDefinition(option.getWargearDefinition())
                            .isDefault(option.isDefault())
                            .attachmentSlots(
                                    option.getAttachmentSlots().stream()
                                            .map(slot -> draftSlotByPublishedSlotId.get(slot.getId()))
                                            .collect(Collectors.toCollection(ArrayList::new)))
                            .build();
            wargearOptionDraftRepository.save(draftOption);
        }

        return draft;
    }


    @Transactional
    public ModelDefinitionDraft updateDraft(
            CurrentAuthenticatedUser currentUser, UUID draftId, UpsertModelDefinitionDraftRequest request) {
        var draft = requireDraft(draftId);
        draft.setName(request.getName());
        draft.setFactionId(request.getFactionId());
        draft.setDescription(request.getDescription());
        draft.setUpdatedBy(currentUser.id());
        modelDefinitionDraftRepository.save(draft);

        applyChildren(draftId, request);

        return toDraftDto(draft);
    }

    @Transactional
    public void discardDraft(UUID draftId) {
        var draft = requireDraft(draftId);
        modelDefinitionDraftRepository.delete(draft);
    }

    /**
     * Publishes a draft: upserts its attachment slots/wargear options onto the published tables
     * by id (creating the model definition itself if this draft was never published before),
     * removes the now-published draft, and records an audit snapshot.
     */
    @Transactional
    public ModelDefinition publishDraft(CurrentAuthenticatedUser currentUser, UUID draftId, String changeSummary) {
        var draft = requireDraft(draftId);
        var draftSlots = attachmentSlotDraftRepository.findAllByModelDefinitionDraftId(draftId);
        var draftOptions = wargearOptionDraftRepository.findAllByModelDefinitionDraftId(draftId);

        var published =
                draft.getPublishedModelDefinitionId() != null
                        ? modelDefinitionRepository
                                .findById(draft.getPublishedModelDefinitionId())
                                .orElseThrow(
                                        () ->
                                                new NotFoundException(
                                                        "Model definition not found: "
                                                                + draft.getPublishedModelDefinitionId()))
                        : ModelDefinitionEntity.builder().version(0).build();

        published.setName(draft.getName());
        published.setDescription(draft.getDescription());
        published.setExternalId(draft.getExternalId());
        published.setFactionId(draft.getFactionId());
        published.setVersion(published.getVersion() + 1);
        published = modelDefinitionRepository.save(published);
        var modelDefinitionId = published.getId();

        var existingPublishedSlots =
                attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(modelDefinitionId)).stream()
                        .collect(Collectors.toMap(AttachmentSlotEntity::getId, s -> s));
        Set<UUID> keptPublishedSlotIds =
                draftSlots.stream()
                        .map(AttachmentSlotDraftEntity::getPublishedAttachmentSlotId)
                        .filter(java.util.Objects::nonNull)
                        .collect(Collectors.toSet());
        var removedSlots =
                existingPublishedSlots.values().stream()
                        .filter(s -> !keptPublishedSlotIds.contains(s.getId()))
                        .toList();
        attachmentSlotRepository.deleteAll(removedSlots);

        Map<UUID, AttachmentSlotEntity> publishedSlotByDraftSlotId = new HashMap<>();
        for (var draftSlot : draftSlots) {
            var publishedSlotId = draftSlot.getPublishedAttachmentSlotId();
            AttachmentSlotEntity publishedSlot;
            if (publishedSlotId != null && existingPublishedSlots.containsKey(publishedSlotId)) {
                publishedSlot = existingPublishedSlots.get(publishedSlotId);
                publishedSlot.setName(draftSlot.getName());
                publishedSlot.setExternalId(draftSlot.getExternalId());
                publishedSlot.setType(draftSlot.getType());
                publishedSlot = attachmentSlotRepository.save(publishedSlot);
            } else {
                publishedSlot =
                        attachmentSlotRepository.save(
                                AttachmentSlotEntity.builder()
                                        .modelDefinitionId(modelDefinitionId)
                                        .name(draftSlot.getName())
                                        .externalId(draftSlot.getExternalId())
                                        .type(draftSlot.getType())
                                        .build());
            }
            publishedSlotByDraftSlotId.put(draftSlot.getId(), publishedSlot);
        }

        var existingPublishedOptions =
                wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(modelDefinitionId)).stream()
                        .collect(Collectors.toMap(WargearOptionEntity::getId, o -> o));
        Set<UUID> keptPublishedOptionIds =
                draftOptions.stream()
                        .map(WargearOptionDraftEntity::getPublishedWargearOptionId)
                        .filter(java.util.Objects::nonNull)
                        .collect(Collectors.toSet());
        var removedOptions =
                existingPublishedOptions.values().stream()
                        .filter(o -> !keptPublishedOptionIds.contains(o.getId()))
                        .toList();
        wargearOptionRepository.deleteAll(removedOptions);

        for (var draftOption : draftOptions) {
            var publishedOptionId = draftOption.getPublishedWargearOptionId();
            WargearOptionEntity publishedOption;
            if (publishedOptionId != null && existingPublishedOptions.containsKey(publishedOptionId)) {
                publishedOption = existingPublishedOptions.get(publishedOptionId);
            } else {
                publishedOption =
                        WargearOptionEntity.builder().modelDefinitionId(modelDefinitionId).build();
            }
            publishedOption.setWargearDefinition(draftOption.getWargearDefinition());
            publishedOption.setDefault(draftOption.isDefault());
            publishedOption.setAttachmentSlots(
                    draftOption.getAttachmentSlots().stream()
                            .map(slot -> publishedSlotByDraftSlotId.get(slot.getId()))
                            .filter(java.util.Objects::nonNull)
                            .collect(Collectors.toCollection(ArrayList::new)));
            wargearOptionRepository.save(publishedOption);
        }

        var publishedDto =
                modelDefinitionMapper
                        .toDto(published)
                        .attachmentSlots(
                                publishedSlotByDraftSlotId.values().stream()
                                        .map(modelDefinitionMapper::toDto)
                                        .toList())
                        .wargearOptions(
                                wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(modelDefinitionId))
                                        .stream()
                                        .map(modelDefinitionMapper::toDto)
                                        .toList());

        modelDefinitionPublishAuditRepository.save(
                ModelDefinitionPublishAuditEntity.builder()
                        .modelDefinitionId(modelDefinitionId)
                        .version(published.getVersion())
                        .publishedBy(currentUser.id())
                        .changeSummary(changeSummary)
                        .snapshot(writeSnapshotJson(publishedDto))
                        .build());

        modelDefinitionDraftRepository.delete(draft);

        return publishedDto;
    }

    public List<ModelDefinitionPublishAuditEntry> getPublishHistory(UUID modelDefinitionId) {
        return modelDefinitionPublishAuditRepository
                .findAllByModelDefinitionIdOrderByVersionDesc(modelDefinitionId)
                .stream()
                .map(this::toAuditDto)
                .toList();
    }

    /**
     * Exports the model definitions only. The factions and wargear they reference are exported
     * from their own admin pages, so this document names neither - it carries their stable ids and
     * expects them to already exist when it is imported.
     */
    public ModelDefinitionExport exportModelDefinitions() {
        Map<UUID, String> factionSourceIdById =
                factionRepository.findAllByOwnerUserIdIsNull().stream()
                        .collect(Collectors.toMap(FactionEntity::getId, FactionEntity::getExternalId));

        var modelDefinitions = modelDefinitionRepository.findAllByOwnerUserIdIsNull();
        var modelDefinitionIds = modelDefinitions.stream().map(ModelDefinitionEntity::getId).toList();

        Map<UUID, List<AttachmentSlotEntity>> slotsByModelDefinitionId =
                attachmentSlotRepository.findAllByModelDefinitionIdIn(modelDefinitionIds).stream()
                        .collect(Collectors.groupingBy(AttachmentSlotEntity::getModelDefinitionId));
        Map<UUID, List<WargearOptionEntity>> optionsByModelDefinitionId =
                wargearOptionRepository.findAllByModelDefinitionIdIn(modelDefinitionIds).stream()
                        .collect(Collectors.groupingBy(WargearOptionEntity::getModelDefinitionId));

        var items =
                modelDefinitions.stream()
                        .map(
                                md -> {
                                    var slots = slotsByModelDefinitionId.getOrDefault(md.getId(), List.of());
                                    Map<UUID, String> slotSourceIdById =
                                            slots.stream()
                                                    .collect(
                                                            Collectors.toMap(
                                                                    AttachmentSlotEntity::getId,
                                                                    s -> sourceId(s.getExternalId(), s.getId())));
                                    var options = optionsByModelDefinitionId.getOrDefault(md.getId(), List.of());

                                    return new ModelDefinitionExportItem(
                                                   sourceId(md.getExternalId(), md.getId()),
                                                    md.getFactionId() != null
                                                            ? factionSourceIdById.get(md.getFactionId())
                                                            : null,
                                                    md.getName(),
                                                    slots.stream()
                                                            .map(
                                                                    s ->
                                                                            new ModelDefinitionExportItemAttachmentSlotsInner(
                                                                                            sourceId(
                                                                                                    s.getExternalId(),
                                                                                                    s.getId()),
                                                                                            s.getName(),
                                                                                            s.getType()))
                                                            .toList(),
                                                    options.stream()
                                                            .map(
                                                                    o ->
                                                                            new ModelDefinitionExportItemWargearOptionsInner(
                                                                                            wargearSourceId(o),
                                                                                            o.isDefault(),
                                                                                            o.getAttachmentSlots().stream()
                                                                                                    .map(
                                                                                                            s ->
                                                                                                                    slotSourceIdById.get(
                                                                                                                            s.getId()))
                                                                                                    .toList()))
                                                            .toList())
                                            .description(md.getDescription());
                                })
                        .toList();

        return new ModelDefinitionExport(ExportSchema.CURRENT_VERSION, items)
                .exportedAt(OffsetDateTime.now(ZoneOffset.UTC));
    }

    /**
     * Imports a versioned export document as drafts: an item is matched first by source 'id'
     * (when present) then by name to an existing published model definition (seeding the draft
     * from its current state, same as {@link #startDraft}, then overlaying the imported fields)
     * where possible, otherwise a brand-new draft is created. Nothing is published automatically.
     *
     * <p>The factions and wargear an item references are looked up by stable source id and must
     * already exist - they are imported from their own admin pages, so an unknown id fails the
     * import rather than inventing a nameless placeholder. Older combined catalogues that define
     * them inline are still accepted, and their definitions are upserted first.
     *
     * <p>Importing is idempotent: an item whose content already matches what is stored is skipped
     * rather than turned into an empty draft edit, so re-importing the same catalogue twice leaves
     * nothing to review the second time and only genuine changes are surfaced. "What is stored"
     * means the item's open draft when it has one, otherwise the published definition. Only the
     * definitions that were actually created or updated are returned.
     */
    @Transactional
    public List<ModelDefinitionDraft> importModelDefinitions(
            CurrentAuthenticatedUser currentUser, ModelDefinitionExport export) {
        ExportSchema.requireSupported(export.getSchemaVersion(), "model definition");

        // Deprecated, for older combined catalogues only: current documents carry no factions.
        factionDefinitionService.upsertFactions(export.getFactions());
        var factionBySourceId =
                factionRepository.findAllByOwnerUserIdIsNull().stream()
                        .collect(Collectors.toMap(FactionEntity::getExternalId, f -> f, (a, b) -> a));

        var existingDefinitions = modelDefinitionRepository.findAllByOwnerUserIdIsNull();
        var existingByExternalId =
                existingDefinitions.stream()
                        .filter(md -> md.getExternalId() != null)
                        .collect(Collectors.toMap(ModelDefinitionEntity::getExternalId, md -> md, (a, b) -> a));
        // Names are no longer unique, so this legacy fallback picks an arbitrary match among
        // same-named rows. It only applies to hand-authored definitions that predate source ids.
        var existingByName =
                existingDefinitions.stream()
                        .collect(Collectors.toMap(ModelDefinitionEntity::getName, md -> md, (a, b) -> a));

        warnOnDuplicateNames(export.getModelDefinitions());

        var wargearDefinitions = resolveWargear(export);

        // Drafts already open for these definitions are the most recent state of record, so they
        // (not the published rows) are what an incoming item is compared against and applied to.
        var existingDrafts = modelDefinitionDraftRepository.findAll();
        var draftsByPublishedId =
                existingDrafts.stream()
                        .filter(d -> d.getPublishedModelDefinitionId() != null)
                        .collect(
                                Collectors.toMap(
                                        ModelDefinitionDraftEntity::getPublishedModelDefinitionId,
                                        d -> d,
                                        (a, b) -> a));
        // Drafts for definitions that have never been published: matching these by source id is
        // what stops a re-import creating a second draft for the same definition.
        var standaloneDraftsByExternalId =
                existingDrafts.stream()
                        .filter(d -> d.getPublishedModelDefinitionId() == null && d.getExternalId() != null)
                        .collect(
                                Collectors.toMap(ModelDefinitionDraftEntity::getExternalId, d -> d, (a, b) -> a));

        var publishedSignatures = publishedSignatures(existingDefinitions);
        var draftSignatures = draftSignatures(existingDrafts);

        List<ModelDefinitionDraft> changed = new ArrayList<>();
        int unchanged = 0;
        for (var item : export.getModelDefinitions()) {
            var existing = item.getId() != null ? existingByExternalId.get(item.getId()) : null;
            if (existing == null) {
                existing = existingByName.get(item.getName());
            }

            FactionEntity faction = null;
            if (item.getFactionId() != null) {
                faction = factionBySourceId.get(item.getFactionId());
                if (faction == null) {
                    throw new BadRequestException(
                            "Model definition '"
                                    + item.getName()
                                    + "' references unknown faction id '"
                                    + item.getFactionId()
                                    + "'. Import the factions from the Manage Factions page first.");
                }
            }

            var draft =
                    existing != null
                            ? draftsByPublishedId.get(existing.getId())
                            : item.getId() != null ? standaloneDraftsByExternalId.get(item.getId()) : null;

            var current =
                    draft != null
                            ? draftSignatures.get(draft.getId())
                            : existing != null ? publishedSignatures.get(existing.getId()) : null;
            if (current != null && current.equals(signatureOf(item, faction))) {
                unchanged++;
                continue;
            }

            changed.add(importItem(currentUser, item, existing, draft, faction, wargearDefinitions));
        }

        log.info(
                "Imported {} model definitions: {} created or updated as drafts, {} already up to date",
                export.getModelDefinitions().size(),
                changed.size(),
                unchanged);

        return changed;
    }

    /**
     * An order-insensitive snapshot of everything an import can set on a model definition, so a
     * re-imported item can be compared against what is already stored and skipped when identical.
     * Collections are sorted because neither the export document nor the database guarantees a
     * stable row order, and an incidental reordering is not a change worth drafting.
     */
    private record DefinitionSignature(
            String name, String description, UUID factionId, List<String> slots, List<String> options) {}

    private DefinitionSignature signatureOf(ModelDefinitionExportItem item, FactionEntity faction) {
        return new DefinitionSignature(
                item.getName(),
                blankToNull(item.getDescription()),
                faction != null ? faction.getId() : null,
                item.getAttachmentSlots().stream()
                        .map(s -> slotKey(s.getId(), s.getName(), s.getType()))
                        .sorted()
                        .toList(),
                item.getWargearOptions().stream()
                        .map(o -> optionKey(o.getId(), Boolean.TRUE.equals(o.getIsDefault()), o.getSlotIds()))
                        .sorted()
                        .toList());
    }

    private Map<UUID, DefinitionSignature> publishedSignatures(List<ModelDefinitionEntity> definitions) {
        var ids = definitions.stream().map(ModelDefinitionEntity::getId).toList();
        var slotsByDefinitionId =
                attachmentSlotRepository.findAllByModelDefinitionIdIn(ids).stream()
                        .collect(Collectors.groupingBy(AttachmentSlotEntity::getModelDefinitionId));
        var optionsByDefinitionId =
                wargearOptionRepository.findAllByModelDefinitionIdIn(ids).stream()
                        .collect(Collectors.groupingBy(WargearOptionEntity::getModelDefinitionId));

        Map<UUID, DefinitionSignature> signatures = new HashMap<>();
        for (var definition : definitions) {
            var slots = slotsByDefinitionId.getOrDefault(definition.getId(), List.of());
            var options = optionsByDefinitionId.getOrDefault(definition.getId(), List.of());
            Map<UUID, String> slotSourceIdById =
                    slots.stream()
                            .collect(
                                    Collectors.toMap(
                                            AttachmentSlotEntity::getId,
                                            s -> sourceId(s.getExternalId(), s.getId())));
            signatures.put(
                    definition.getId(),
                    new DefinitionSignature(
                            definition.getName(),
                            blankToNull(definition.getDescription()),
                            definition.getFactionId(),
                            slots.stream()
                                    .map(s -> slotKey(slotSourceIdById.get(s.getId()), s.getName(), s.getType()))
                                    .sorted()
                                    .toList(),
                            options.stream()
                                    .map(
                                            o ->
                                                    optionKey(
                                                            wargearSourceId(o),
                                                            o.isDefault(),
                                                            o.getAttachmentSlots().stream()
                                                                    .map(s -> slotSourceIdById.get(s.getId()))
                                                                    .toList()))
                                    .sorted()
                                    .toList()));
        }
        return signatures;
    }

    private Map<UUID, DefinitionSignature> draftSignatures(List<ModelDefinitionDraftEntity> drafts) {
        var ids = drafts.stream().map(ModelDefinitionDraftEntity::getId).toList();
        var slotsByDraftId =
                attachmentSlotDraftRepository.findAllByModelDefinitionDraftIdIn(ids).stream()
                        .collect(Collectors.groupingBy(AttachmentSlotDraftEntity::getModelDefinitionDraftId));
        var optionsByDraftId =
                wargearOptionDraftRepository.findAllByModelDefinitionDraftIdIn(ids).stream()
                        .collect(Collectors.groupingBy(WargearOptionDraftEntity::getModelDefinitionDraftId));

        Map<UUID, DefinitionSignature> signatures = new HashMap<>();
        for (var draft : drafts) {
            var slots = slotsByDraftId.getOrDefault(draft.getId(), List.of());
            var options = optionsByDraftId.getOrDefault(draft.getId(), List.of());
            Map<UUID, String> slotSourceIdById =
                    slots.stream()
                            .collect(
                                    Collectors.toMap(
                                            AttachmentSlotDraftEntity::getId,
                                            s -> sourceId(s.getExternalId(), s.getId())));
            signatures.put(
                    draft.getId(),
                    new DefinitionSignature(
                            draft.getName(),
                            blankToNull(draft.getDescription()),
                            draft.getFactionId(),
                            slots.stream()
                                    .map(s -> slotKey(slotSourceIdById.get(s.getId()), s.getName(), s.getType()))
                                    .sorted()
                                    .toList(),
                            options.stream()
                                    .map(
                                            o ->
                                                    optionKey(
                                                            wargearSourceId(o),
                                                            o.isDefault(),
                                                            o.getAttachmentSlots().stream()
                                                                    .map(s -> slotSourceIdById.get(s.getId()))
                                                                    .toList()))
                                    .sorted()
                                    .toList()));
        }
        return signatures;
    }

    private static String slotKey(String sourceId, String name, String type) {
        return String.join("\u001f", sourceId, name, type == null ? "" : type);
    }

    /**
     * The wargear name is deliberately absent: it belongs to the shared definition, so renaming a
     * piece of wargear is a change to that definition rather than to every model definition using
     * it. Including it here would also make import non-idempotent whenever the source dataset
     * spells the same wargear id differently in different models.
     */
    private static String optionKey(String sourceId, boolean isDefault, List<String> slotSourceIds) {
        return String.join(
                "\u001f",
                sourceId,
                Boolean.toString(isDefault),
                slotSourceIds.stream().sorted().collect(Collectors.joining(",")));
    }

    /**
     * The stable identity of the wargear a usage row points at: its dataset id when it has one,
     * otherwise the definition's own UUID (never the usage row's, which differs per model and
     * would stop the same wargear matching across definitions).
     */
    private static String wargearSourceId(WargearOptionEntity option) {
        return wargearSourceId(option.getWargearDefinition());
    }

    private static String wargearSourceId(WargearOptionDraftEntity option) {
        return wargearSourceId(option.getWargearDefinition());
    }

    private static String wargearSourceId(WargearDefinitionEntity definition) {
        return definition.getExternalId() != null
                ? definition.getExternalId()
                : definition.getId().toString();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    /**
     * Resolves every wargear id the document's models reference to a shared {@link
     * WargearDefinitionEntity}, keyed by source id.
     *
     * <p>Wargear is imported from its own admin page, so this document is expected to reference
     * wargear that already exists. An id that cannot be resolved fails the import: a models-only
     * document carries no name for it, so the alternative is a nameless placeholder definition.
     */
    private Map<String, WargearDefinitionEntity> resolveWargear(ModelDefinitionExport export) {
        var referencedIds =
                export.getModelDefinitions().stream()
                        .flatMap(item -> item.getWargearOptions().stream())
                        .map(ModelDefinitionExportItemWargearOptionsInner::getId)
                        .collect(Collectors.toCollection(LinkedHashSet::new));
        if (referencedIds.isEmpty()) {
            return Map.of();
        }

        // Deprecated, for older combined catalogues only: anything they name is upserted first.
        Map<String, WargearDefinitionEntity> bySourceId =
                new LinkedHashMap<>(
                        wargearDefinitionService
                                .upsertWargear(wargearNamesInDocument(export))
                                .bySourceId());

        var unresolved = referencedIds.stream().filter(id -> !bySourceId.containsKey(id)).toList();
        bySourceId.putAll(wargearDefinitionService.findBySourceIds(unresolved));

        var missing = referencedIds.stream().filter(id -> !bySourceId.containsKey(id)).sorted().toList();
        if (!missing.isEmpty()) {
            throw new BadRequestException(
                    "Import references wargear that does not exist: "
                            + String.join(", ", missing)
                            + ". Import the wargear from the Manage Wargear Definitions page first.");
        }

        return bySourceId;
    }

    /**
     * Collects the wargear names an older combined catalogue defines inline. Current documents
     * define none, and return an empty map.
     *
     * <p>Schema version 4 combined catalogues carry a top-level 'wargear' section naming each item
     * once. Version 3 repeats the name inline on every option and does not always spell it
     * identically (e.g. "Shuriken Pistol" vs "Shuriken pistol"), so the first spelling seen wins
     * and the rest are logged - letting the last model win would make the name depend on order.
     */
    private Map<String, String> wargearNamesInDocument(ModelDefinitionExport export) {
        Map<String, String> nameBySourceId = new LinkedHashMap<>();

        if (export.getWargear() != null && !export.getWargear().isEmpty()) {
            export.getWargear().forEach(item -> nameBySourceId.putIfAbsent(item.getId(), item.getName()));
            return nameBySourceId;
        }

        Map<String, Set<String>> allNamesBySourceId = new LinkedHashMap<>();
        for (var item : export.getModelDefinitions()) {
            for (var option : item.getWargearOptions()) {
                if (option.getName() == null) {
                    continue;
                }
                nameBySourceId.putIfAbsent(option.getId(), option.getName());
                allNamesBySourceId
                        .computeIfAbsent(option.getId(), id -> new LinkedHashSet<>())
                        .add(option.getName());
            }
        }

        allNamesBySourceId.forEach(
                (sourceId, names) -> {
                    if (names.size() > 1) {
                        log.warn(
                                "Wargear '{}' is named inconsistently in the import ({}); keeping '{}'."
                                        + " Rename it on the wargear definition to change it everywhere.",
                                sourceId,
                                String.join("', '", names),
                                nameBySourceId.get(sourceId));
                    }
                });

        return nameBySourceId;
    }

    /**
     * Logs a warning for imports containing duplicate model definition names.
     *
     * <p>Names are display data, not identity - stable source ids are - and different game systems
     * legitimately reuse a model name, so this does not block the import. It is still usually a
     * copy/paste mistake in the source dataset, and duplicates make the legacy name-fallback match
     * below ambiguous, so it is worth surfacing.
     */
    private void warnOnDuplicateNames(List<ModelDefinitionExportItem> items) {
        Map<String, List<String>> sourceIdsByName = new LinkedHashMap<>();
        for (var item : items) {
            sourceIdsByName
                    .computeIfAbsent(item.getName(), n -> new ArrayList<>())
                    .add(item.getId());
        }

        sourceIdsByName.forEach(
                (name, sourceIds) -> {
                    if (sourceIds.size() > 1) {
                        log.warn(
                                "Import contains {} model definitions named '{}' ({}). This is allowed - "
                                        + "names are not identity - but check it is intentional.",
                                sourceIds.size(),
                                name,
                                String.join(", ", sourceIds));
                    }
                });
    }

    private ModelDefinitionDraft importItem(
            CurrentAuthenticatedUser currentUser,
            ModelDefinitionExportItem item,
            ModelDefinitionEntity existingPublished,
            ModelDefinitionDraftEntity existingDraft,
            FactionEntity faction,
            Map<String, WargearDefinitionEntity> wargearDefinitions) {
        UUID draftId;
        if (existingDraft != null) {
            draftId = existingDraft.getId();
        } else if (existingPublished != null) {
            draftId = startOrGetDraftEntity(currentUser, existingPublished.getId()).getId();
        } else {
            draftId =
                    modelDefinitionDraftRepository
                            .save(
                                    ModelDefinitionDraftEntity.builder()
                                            .name(item.getName())
                                            .description(item.getDescription())
                                            .createdBy(currentUser.id())
                                            .updatedBy(currentUser.id())
                                            .build())
                            .getId();
        }

        var draftEntity = requireDraft(draftId);
        draftEntity.setName(item.getName());
        draftEntity.setDescription(item.getDescription());
        draftEntity.setExternalId(item.getId());
        draftEntity.setFactionId(faction != null ? faction.getId() : null);
        draftEntity.setUpdatedBy(currentUser.id());
        modelDefinitionDraftRepository.save(draftEntity);

        // Replace this draft's slots/options entirely, preserving published row ids by stable source
        // id (with name fallback for legacy drafts). Options must be deleted before slots because
        // their many-to-many join rows have no entity cascade.
        var existingOptions =
                wargearOptionDraftRepository.findAllByModelDefinitionDraftId(draftId);
        var existingOptionsByWargearSourceId =
                existingOptions.stream()
                        .collect(
                                Collectors.toMap(
                                        ModelDefinitionDraftService::wargearSourceId, o -> o, (a, b) -> a));
        var existingOptionsByName =
                existingOptions.stream()
                        .collect(
                                Collectors.toMap(
                                        o -> o.getWargearDefinition().getName(), o -> o, (a, b) -> a));
        wargearOptionDraftRepository.deleteAllByModelDefinitionDraftId(draftId);

        var existingSlots = attachmentSlotDraftRepository.findAllByModelDefinitionDraftId(draftId);
        var existingSlotsByExternalId =
                existingSlots.stream()
                        .filter(s -> s.getExternalId() != null)
                        .collect(Collectors.toMap(AttachmentSlotDraftEntity::getExternalId, s -> s, (a, b) -> a));
        var existingSlotsByName =
                existingSlots.stream()
                        .collect(Collectors.toMap(AttachmentSlotDraftEntity::getName, s -> s, (a, b) -> a));
        attachmentSlotDraftRepository.deleteAllByModelDefinitionDraftId(draftId);
        Map<String, AttachmentSlotDraftEntity> slotBySourceId = new HashMap<>();
        for (var slotItem : item.getAttachmentSlots()) {
            var previous = existingSlotsByExternalId.get(slotItem.getId());
            if (previous == null) {
                previous = existingSlotsByName.get(slotItem.getName());
            }
            var slot =
                    attachmentSlotDraftRepository.save(
                            AttachmentSlotDraftEntity.builder()
                                    .modelDefinitionDraftId(draftId)
                                    .publishedAttachmentSlotId(
                                            previous != null ? previous.getPublishedAttachmentSlotId() : null)
                                    .externalId(slotItem.getId())
                                    .name(slotItem.getName())
                                    .type(slotItem.getType())
                                    .build());
            slotBySourceId.put(slotItem.getId(), slot);
        }

        for (var optionItem : item.getWargearOptions()) {
            var previous = existingOptionsByWargearSourceId.get(optionItem.getId());
            if (previous == null) {
                previous = existingOptionsByName.get(optionItem.getName());
            }
            var slots =
                    optionItem.getSlotIds().stream()
                            .map(
                                    slotId -> {
                                        var slot = slotBySourceId.get(slotId);
                                        if (slot == null) {
                                            throw new BadRequestException(
                                                    "Wargear option '"
                                                            + optionItem.getId()
                                                            + "' references unknown attachment slot id '"
                                                            + slotId
                                                            + "' on model definition '"
                                                            + item.getId()
                                                            + "'");
                                        }
                                        return slot;
                                    })
                            .collect(Collectors.toCollection(ArrayList::new));
            wargearOptionDraftRepository.save(
                    WargearOptionDraftEntity.builder()
                            .modelDefinitionDraftId(draftId)
                            .publishedWargearOptionId(
                                    previous != null ? previous.getPublishedWargearOptionId() : null)
                            .wargearDefinition(wargearDefinitions.get(optionItem.getId()))
                            .isDefault(Boolean.TRUE.equals(optionItem.getIsDefault()))
                            .attachmentSlots(slots)
                            .build());
        }

        return toDraftDto(requireDraft(draftId));
    }

    /**
     * Replaces a draft's attachment slots and wargear options with the given request's contents:
     * rows whose id is present in the request are updated in place, rows not present are removed,
     * and rows without a matching existing id are created fresh (any id sent by the client for a
     * new row is only used to correlate wargear options to slots within the same request; the
     * persisted row gets its own server-generated id).
     */
    private void applyChildren(UUID draftId, UpsertModelDefinitionDraftRequest request) {
        var existingSlots =
                attachmentSlotDraftRepository.findAllByModelDefinitionDraftId(draftId).stream()
                        .collect(Collectors.toMap(AttachmentSlotDraftEntity::getId, s -> s));

        Map<UUID, AttachmentSlotDraftEntity> resolvedSlotByRequestId = new HashMap<>();
        for (UpsertAttachmentSlotDraftRequest slotReq : request.getAttachmentSlots()) {
            var existing = existingSlots.remove(slotReq.getId());
            AttachmentSlotDraftEntity saved;
            if (existing != null) {
                existing.setName(slotReq.getName());
                existing.setType(slotReq.getType());
                saved = attachmentSlotDraftRepository.save(existing);
            } else {
                saved =
                        attachmentSlotDraftRepository.save(
                                AttachmentSlotDraftEntity.builder()
                                        .modelDefinitionDraftId(draftId)
                                        .name(slotReq.getName())
                                        .type(slotReq.getType())
                                        .build());
            }
            resolvedSlotByRequestId.put(slotReq.getId(), saved);
        }
        // Any slot not referenced by the request has been removed.
        attachmentSlotDraftRepository.deleteAll(existingSlots.values());

        var existingOptions =
                wargearOptionDraftRepository.findAllByModelDefinitionDraftId(draftId).stream()
                        .collect(Collectors.toMap(WargearOptionDraftEntity::getId, o -> o));

        for (UpsertWargearOptionDraftRequest optionReq : request.getWargearOptions()) {
            var existing = existingOptions.remove(optionReq.getId());
            var slots =
                    optionReq.getAttachmentSlotIds().stream()
                            .map(resolvedSlotByRequestId::get)
                            .filter(java.util.Objects::nonNull)
                            .collect(Collectors.toCollection(ArrayList::new));
            var wargearDefinition = resolveWargearDefinition(optionReq);
            if (existing != null) {
                existing.setWargearDefinition(wargearDefinition);
                existing.setDefault(Boolean.TRUE.equals(optionReq.getIsDefault()));
                existing.setAttachmentSlots(slots);
                wargearOptionDraftRepository.save(existing);
            } else {
                wargearOptionDraftRepository.save(
                        WargearOptionDraftEntity.builder()
                                .modelDefinitionDraftId(draftId)
                                .wargearDefinition(wargearDefinition)
                                .isDefault(Boolean.TRUE.equals(optionReq.getIsDefault()))
                                .attachmentSlots(slots)
                                .build());
            }
        }
        // Any option not referenced by the request has been removed.
        wargearOptionDraftRepository.deleteAll(existingOptions.values());
    }

    /**
     * Resolves the shared wargear a hand-edited draft option points at: by id when the client sent
     * one, otherwise by name among the hand-authored definitions, creating one if it is a name we
     * have not seen before.
     *
     * <p>Matching by name deliberately only considers definitions with no dataset id and no owner.
     * Attaching a hand-typed name to a dataset-owned definition would silently couple this model to
     * the reference data and let a later import change it, and attaching it to some user's personal
     * wargear would pull their private row into the shared catalogue.
     */
    private WargearDefinitionEntity resolveWargearDefinition(UpsertWargearOptionDraftRequest optionReq) {
        if (optionReq.getWargearDefinitionId() != null) {
            return wargearDefinitionRepository
                    .findById(optionReq.getWargearDefinitionId())
                    .orElseThrow(
                            () ->
                                    new NotFoundException(
                                            "Wargear definition not found: "
                                                    + optionReq.getWargearDefinitionId()));
        }
        return wargearDefinitionRepository
                .findFirstByExternalIdIsNullAndOwnerUserIdIsNullAndNameIgnoreCase(optionReq.getName())
                .orElseGet(
                        () ->
                                wargearDefinitionRepository.save(
                                        WargearDefinitionEntity.builder()
                                                .name(optionReq.getName())
                                                .build()));
    }

    private ModelDefinitionDraftEntity requireDraft(UUID draftId) {
        return modelDefinitionDraftRepository
                .findById(draftId)
                .orElseThrow(() -> new NotFoundException("Model definition draft not found: " + draftId));
    }

    /**
     * Maps drafts to DTOs, loading every draft's children in a fixed number of queries.
     *
     * <p>Mapping drafts one at a time costs two queries each plus the per-option association loads
     * described on {@link WargearOptionDraftRepository#findAllByModelDefinitionDraftIdIn(List)}.
     */
    private List<ModelDefinitionDraft> withChildren(List<ModelDefinitionDraftEntity> entities) {
        if (entities.isEmpty()) {
            return List.of();
        }
        var ids = entities.stream().map(ModelDefinitionDraftEntity::getId).toList();

        Map<UUID, List<AttachmentSlotDraft>> slotsByDraftId =
                attachmentSlotDraftRepository.findAllByModelDefinitionDraftIdIn(ids).stream()
                        .collect(
                                Collectors.groupingBy(
                                        AttachmentSlotDraftEntity::getModelDefinitionDraftId,
                                        Collectors.mapping(
                                                modelDefinitionMapper::toDto, Collectors.toList())));

        Map<UUID, List<WargearOptionDraft>> optionsByDraftId =
                wargearOptionDraftRepository.findAllByModelDefinitionDraftIdIn(ids).stream()
                        .collect(
                                Collectors.groupingBy(
                                        WargearOptionDraftEntity::getModelDefinitionDraftId,
                                        Collectors.mapping(
                                                modelDefinitionMapper::toDto, Collectors.toList())));

        return entities.stream()
                .map(
                        entity ->
                                modelDefinitionMapper
                                        .toDto(entity)
                                        .attachmentSlots(slotsByDraftId.getOrDefault(entity.getId(), List.of()))
                                        .wargearOptions(optionsByDraftId.getOrDefault(entity.getId(), List.of())))
                .toList();
    }

    private ModelDefinitionDraft toDraftDto(ModelDefinitionDraftEntity entity) {
        return withChildren(List.of(entity)).getFirst();
    }

    private ModelDefinitionPublishAuditEntry toAuditDto(ModelDefinitionPublishAuditEntity entity) {
        return new ModelDefinitionPublishAuditEntry()
                .id(entity.getId())
                .modelDefinitionId(entity.getModelDefinitionId())
                .version(entity.getVersion())
                .publishedBy(entity.getPublishedBy())
                .publishedAt(OffsetDateTime.ofInstant(entity.getPublishedAt(), ZoneOffset.UTC))
                .changeSummary(entity.getChangeSummary())
                .snapshot(entity.getSnapshot());
    }

    /**
     * Resolves the {@code id} emitted for an exported row.
     *
     * <p>Rows that originated from the reference dataset carry its stable {@code externalId}, which
     * is what makes re-import match (and future customisation diffs stay stable) across renames.
     * Hand-authored rows have no dataset id, so the persisted UUID is emitted instead: the export
     * contract requires a non-null id, and the UUID is equally stable for this row. Re-importing
     * such a definition matches it by name and stamps that UUID as its {@code externalId}, so the
     * id is idempotent from then on.
     */
    private String sourceId(String externalId, UUID persistedId) {
        return externalId != null ? externalId : persistedId.toString();
    }

    @SneakyThrows
    private String writeSnapshotJson(ModelDefinition modelDefinition) {
        return objectMapper.writeValueAsString(modelDefinition);
    }
}

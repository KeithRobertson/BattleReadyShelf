package com.keith.battlereadyshelf.modeldefinition;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.Faction;
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
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;

import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
@RequiredArgsConstructor
public class ModelDefinitionDraftService {
    /** The current version of the {@link ModelDefinitionExport} document schema. */
    private static final int CURRENT_EXPORT_SCHEMA_VERSION = 2;

    private final ModelDefinitionRepository modelDefinitionRepository;
    private final AttachmentSlotRepository attachmentSlotRepository;
    private final WargearOptionRepository wargearOptionRepository;
    private final FactionRepository factionRepository;
    private final ModelDefinitionDraftRepository modelDefinitionDraftRepository;
    private final AttachmentSlotDraftRepository attachmentSlotDraftRepository;
    private final WargearOptionDraftRepository wargearOptionDraftRepository;
    private final ModelDefinitionPublishAuditRepository modelDefinitionPublishAuditRepository;
    private final ModelDefinitionMapper modelDefinitionMapper;
    private final ObjectMapper objectMapper;

    public List<ModelDefinitionDraft> getAllDrafts() {
        return modelDefinitionDraftRepository.findAll().stream().map(this::toDraftDto).toList();
    }

    /** Lists all factions, for admin tooling such as grouping model definitions by faction. */
    public List<Faction> getAllFactions() {
        return factionRepository.findAll().stream().map(modelDefinitionMapper::toDto).toList();
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
                                    .name(slot.getName())
                                    .build());
            draftSlotByPublishedSlotId.put(slot.getId(), draftSlot);
        }

        for (var option : publishedOptions) {
            var draftOption =
                    WargearOptionDraftEntity.builder()
                            .modelDefinitionDraftId(draft.getId())
                            .publishedWargearOptionId(option.getId())
                            .name(option.getName())
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
                publishedSlot = attachmentSlotRepository.save(publishedSlot);
            } else {
                publishedSlot =
                        attachmentSlotRepository.save(
                                AttachmentSlotEntity.builder()
                                        .modelDefinitionId(modelDefinitionId)
                                        .name(draftSlot.getName())
                                        .externalId(draftSlot.getExternalId())
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
            publishedOption.setName(draftOption.getName());
            publishedOption.setDefault(draftOption.isDefault());
            publishedOption.setExternalId(draftOption.getExternalId());
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

    public ModelDefinitionExport exportModelDefinitions() {
        var factions = factionRepository.findAll();
        Map<UUID, String> factionExternalIdById =
                factions.stream().collect(Collectors.toMap(FactionEntity::getId, FactionEntity::getExternalId));

        var factionItems =
                factions.stream()
                        .map(
                                f ->
                                        new FactionExportItem(f.getExternalId(), f.getName())
                                                .parentFactionExternalId(
                                                        f.getParentFactionId() != null
                                                                ? factionExternalIdById.get(f.getParentFactionId())
                                                                : null))
                        .toList();

        var modelDefinitions = modelDefinitionRepository.findAll();
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
                                    Map<UUID, String> slotNameById =
                                            slots.stream()
                                                    .collect(
                                                            Collectors.toMap(
                                                                    AttachmentSlotEntity::getId,
                                                                    AttachmentSlotEntity::getName));
                                    var options = optionsByModelDefinitionId.getOrDefault(md.getId(), List.of());

                                    return new ModelDefinitionExportItem(
                                                    md.getName(),
                                                    slots.stream()
                                                            .map(
                                                                    s ->
                                                                            new ModelDefinitionExportItemAttachmentSlotsInner(
                                                                                            s.getName())
                                                                                    .externalId(s.getExternalId()))
                                                            .toList(),
                                                    options.stream()
                                                            .map(
                                                                    o ->
                                                                            new ModelDefinitionExportItemWargearOptionsInner(
                                                                                            o.getName(),
                                                                                            o.isDefault(),
                                                                                            o.getAttachmentSlots().stream()
                                                                                                    .map(
                                                                                                            s ->
                                                                                                                    slotNameById.get(
                                                                                                                            s.getId()))
                                                                                                    .toList())
                                                                                    .externalId(o.getExternalId()))
                                                            .toList())
                                            .description(md.getDescription())
                                            .externalId(md.getExternalId())
                                            .factionExternalId(
                                                    md.getFactionId() != null
                                                            ? factionExternalIdById.get(md.getFactionId())
                                                            : null);
                                })
                        .toList();

        return new ModelDefinitionExport(CURRENT_EXPORT_SCHEMA_VERSION, factionItems, items)
                .exportedAt(OffsetDateTime.now(ZoneOffset.UTC));
    }

    /**
     * Imports a versioned export document as drafts: an item is matched first by 'externalId'
     * (when present) then by name to an existing published model definition (seeding the draft
     * from its current state, same as {@link #startDraft}, then overlaying the imported fields)
     * where possible, otherwise a brand-new draft is created. Referenced factions are upserted by
     * 'externalId' directly onto the published faction table (factions have no draft/publish
     * workflow of their own). Nothing is published automatically.
     */
    @Transactional
    public List<ModelDefinitionDraft> importModelDefinitions(
            CurrentAuthenticatedUser currentUser, ModelDefinitionExport export) {
        if (export.getSchemaVersion() == null || export.getSchemaVersion() != CURRENT_EXPORT_SCHEMA_VERSION) {
            throw new BadRequestException(
                    "Unsupported model definition export schemaVersion: " + export.getSchemaVersion());
        }

        var factionByExternalId = upsertFactions(export.getFactions());

        var existingByExternalId =
                modelDefinitionRepository.findAll().stream()
                        .filter(md -> md.getExternalId() != null)
                        .collect(Collectors.toMap(ModelDefinitionEntity::getExternalId, md -> md, (a, b) -> a));
        var existingByName =
                modelDefinitionRepository.findAll().stream()
                        .collect(Collectors.toMap(ModelDefinitionEntity::getName, md -> md, (a, b) -> a));

        return export.getModelDefinitions().stream()
                .map(
                        item -> {
                            var existing =
                                    item.getExternalId() != null
                                            ? existingByExternalId.get(item.getExternalId())
                                            : null;
                            if (existing == null) {
                                existing = existingByName.get(item.getName());
                            }

                            FactionEntity faction = null;
                            if (item.getFactionExternalId() != null) {
                                faction = factionByExternalId.get(item.getFactionExternalId());
                                if (faction == null) {
                                    throw new BadRequestException(
                                            "Model definition '"
                                                    + item.getName()
                                                    + "' references unknown faction externalId '"
                                                    + item.getFactionExternalId()
                                                    + "'");
                                }
                            }

                            return importItem(currentUser, item, existing, faction);
                        })
                .toList();
    }

    /**
     * Upserts factions (matched by 'externalId') directly onto the published table - factions
     * are simple reference/categorisation data with no draft/publish workflow. Parent links are
     * resolved in a second pass so ordering within the import document does not matter.
     */
    private Map<String, FactionEntity> upsertFactions(List<FactionExportItem> factionItems) {
        if (factionItems == null || factionItems.isEmpty()) {
            return Map.of();
        }

        var existingByExternalId =
                factionRepository.findAll().stream()
                        .collect(Collectors.toMap(FactionEntity::getExternalId, f -> f, (a, b) -> a));

        Map<String, FactionEntity> byExternalId = new HashMap<>();
        for (var item : factionItems) {
            var existing = existingByExternalId.get(item.getExternalId());
            var faction =
                    existing != null
                            ? existing
                            : FactionEntity.builder().externalId(item.getExternalId()).build();
            faction.setName(item.getName());
            byExternalId.put(item.getExternalId(), factionRepository.save(faction));
        }

        for (var item : factionItems) {
            if (item.getParentFactionExternalId() == null) {
                continue;
            }
            var parent = byExternalId.get(item.getParentFactionExternalId());
            if (parent == null) {
                throw new BadRequestException(
                        "Faction '"
                                + item.getExternalId()
                                + "' references unknown parent faction externalId '"
                                + item.getParentFactionExternalId()
                                + "'");
            }
            var faction = byExternalId.get(item.getExternalId());
            faction.setParentFactionId(parent.getId());
            byExternalId.put(item.getExternalId(), factionRepository.save(faction));
        }

        return byExternalId;
    }

    private ModelDefinitionDraft importItem(
            CurrentAuthenticatedUser currentUser,
            ModelDefinitionExportItem item,
            ModelDefinitionEntity existingPublished,
            FactionEntity faction) {
        var draftId =
                existingPublished != null
                        ? startOrGetDraftEntity(currentUser, existingPublished.getId()).getId()
                        : modelDefinitionDraftRepository
                                .save(
                                        ModelDefinitionDraftEntity.builder()
                                                .name(item.getName())
                                                .description(item.getDescription())
                                                .createdBy(currentUser.id())
                                                .updatedBy(currentUser.id())
                                                .build())
                                .getId();

        var draftEntity = requireDraft(draftId);
        draftEntity.setName(item.getName());
        draftEntity.setDescription(item.getDescription());
        draftEntity.setExternalId(item.getExternalId());
        draftEntity.setFactionId(faction != null ? faction.getId() : null);
        draftEntity.setUpdatedBy(currentUser.id());
        modelDefinitionDraftRepository.save(draftEntity);

        // Replace this draft's slots/options entirely with the imported ones (matched by name to
        // whatever this draft already had, e.g. seeded from a published definition, so existing
        // ids are preserved where names match). Wargear options must be deleted BEFORE attachment
        // slots: options reference slots via a many-to-many join table with no cascade, so
        // deleting slots first while options (e.g. seeded by startDraft above) still reference
        // them causes Hibernate to see the option's collection pointing at a since-removed
        // (transient, from its perspective) slot when the session next auto-flushes.
        var existingOptionsByName =
                wargearOptionDraftRepository.findAllByModelDefinitionDraftId(draftId).stream()
                        .collect(Collectors.toMap(WargearOptionDraftEntity::getName, o -> o, (a, b) -> a));
        wargearOptionDraftRepository.deleteAllByModelDefinitionDraftId(draftId);

        var existingSlotsByName =
                attachmentSlotDraftRepository.findAllByModelDefinitionDraftId(draftId).stream()
                        .collect(Collectors.toMap(AttachmentSlotDraftEntity::getName, s -> s, (a, b) -> a));
        attachmentSlotDraftRepository.deleteAllByModelDefinitionDraftId(draftId);
        Map<String, AttachmentSlotDraftEntity> slotByName = new HashMap<>();
        for (var slotItem : item.getAttachmentSlots()) {
            var previous = existingSlotsByName.get(slotItem.getName());
            var slot =
                    attachmentSlotDraftRepository.save(
                            AttachmentSlotDraftEntity.builder()
                                    .modelDefinitionDraftId(draftId)
                                    .publishedAttachmentSlotId(
                                            previous != null ? previous.getPublishedAttachmentSlotId() : null)
                                    .externalId(slotItem.getExternalId())
                                    .name(slotItem.getName())
                                    .build());
            slotByName.put(slotItem.getName(), slot);
        }

        for (var optionItem : item.getWargearOptions()) {
            var previous = existingOptionsByName.get(optionItem.getName());
            wargearOptionDraftRepository.save(
                    WargearOptionDraftEntity.builder()
                            .modelDefinitionDraftId(draftId)
                            .publishedWargearOptionId(
                                    previous != null ? previous.getPublishedWargearOptionId() : null)
                            .externalId(optionItem.getExternalId())
                            .name(optionItem.getName())
                            .isDefault(Boolean.TRUE.equals(optionItem.getIsDefault()))
                            .attachmentSlots(
                                    optionItem.getAttachmentSlotNames().stream()
                                            .map(slotByName::get)
                                            .filter(java.util.Objects::nonNull)
                                            .collect(Collectors.toCollection(ArrayList::new)))
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
                saved = attachmentSlotDraftRepository.save(existing);
            } else {
                saved =
                        attachmentSlotDraftRepository.save(
                                AttachmentSlotDraftEntity.builder()
                                        .modelDefinitionDraftId(draftId)
                                        .name(slotReq.getName())
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
            if (existing != null) {
                existing.setName(optionReq.getName());
                existing.setDefault(Boolean.TRUE.equals(optionReq.getIsDefault()));
                existing.setAttachmentSlots(slots);
                wargearOptionDraftRepository.save(existing);
            } else {
                wargearOptionDraftRepository.save(
                        WargearOptionDraftEntity.builder()
                                .modelDefinitionDraftId(draftId)
                                .name(optionReq.getName())
                                .isDefault(Boolean.TRUE.equals(optionReq.getIsDefault()))
                                .attachmentSlots(slots)
                                .build());
            }
        }
        // Any option not referenced by the request has been removed.
        wargearOptionDraftRepository.deleteAll(existingOptions.values());
    }

    private ModelDefinitionDraftEntity requireDraft(UUID draftId) {
        return modelDefinitionDraftRepository
                .findById(draftId)
                .orElseThrow(() -> new NotFoundException("Model definition draft not found: " + draftId));
    }

    private ModelDefinitionDraft toDraftDto(ModelDefinitionDraftEntity entity) {
        var slots = attachmentSlotDraftRepository.findAllByModelDefinitionDraftId(entity.getId());
        var options = wargearOptionDraftRepository.findAllByModelDefinitionDraftId(entity.getId());
        return modelDefinitionMapper
                .toDto(entity)
                .attachmentSlots(slots.stream().map(modelDefinitionMapper::toDto).toList())
                .wargearOptions(options.stream().map(modelDefinitionMapper::toDto).toList());
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

    @SneakyThrows
    private String writeSnapshotJson(ModelDefinition modelDefinition) {
        return objectMapper.writeValueAsString(modelDefinition);
    }
}

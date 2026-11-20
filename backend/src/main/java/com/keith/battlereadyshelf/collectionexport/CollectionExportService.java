package com.keith.battlereadyshelf.collectionexport;

import com.keith.battlereadyshelf.armycollection.ArmyCollectionEntity;
import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.armycollection.ArmyCollectionsService;
import com.keith.battlereadyshelf.armycollection.ModelDefinitionGroupPositionEntity;
import com.keith.battlereadyshelf.armycollection.ModelDefinitionGroupPositionRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelEntity;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelImageEntity;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelImageRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelMagnetizedSlotEntity;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelMagnetizedSlotRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelStatus;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelStatusEventEntity;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelStatusEventRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelWargearSelectionEntity;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelWargearSelectionRepository;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.factiondefinition.FactionEntity;
import com.keith.battlereadyshelf.factiondefinition.FactionRepository;
import com.keith.battlereadyshelf.generated.model.CollectionExport;
import com.keith.battlereadyshelf.generated.model.CollectionExportCollection;
import com.keith.battlereadyshelf.generated.model.CollectionExportInclude;
import com.keith.battlereadyshelf.generated.model.CollectionExportMiniature;
import com.keith.battlereadyshelf.generated.model.CollectionExportModelType;
import com.keith.battlereadyshelf.generated.model.CollectionExportPaint;
import com.keith.battlereadyshelf.generated.model.CollectionExportPaintRecipe;
import com.keith.battlereadyshelf.generated.model.CollectionExportRequest;
import com.keith.battlereadyshelf.generated.model.CollectionExportStatusEvent;
import com.keith.battlereadyshelf.modeldefinition.AttachmentSlotEntity;
import com.keith.battlereadyshelf.modeldefinition.AttachmentSlotRepository;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionEntity;
import com.keith.battlereadyshelf.modeldefinition.WargearOptionEntity;
import com.keith.battlereadyshelf.modeldefinition.WargearOptionRepository;
import com.keith.battlereadyshelf.paint.PaintRecipeEntity;
import com.keith.battlereadyshelf.paint.PaintRecipePaintEntity;
import com.keith.battlereadyshelf.paint.PaintRecipeRepository;
import com.keith.battlereadyshelf.paint.PaintRecipeScope;
import com.keith.battlereadyshelf.storage.PresignedUrlService;
import com.keith.battlereadyshelf.user.User;
import com.keith.battlereadyshelf.user.UserRepository;

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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CollectionExportService {
    private static final Comparator<CollectionModelImageEntity> IMAGE_DISPLAY_ORDER =
            Comparator.comparing(CollectionModelImageEntity::isListThumbnail)
                    .reversed()
                    .thenComparing(
                            CollectionModelImageEntity::getCreatedAt,
                            Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(
                            CollectionModelImageEntity::getId,
                            Comparator.nullsLast(Comparator.naturalOrder()));

    private static final Comparator<CollectionModelEntity> MINIATURE_NAME_ORDER =
            Comparator.comparing(
                            (CollectionModelEntity model) -> {
                                var name = model.getName();
                                return name == null || name.isBlank();
                            })
                    .thenComparing(
                            model -> {
                                var name = model.getName();
                                return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
                            })
                    .thenComparing(CollectionModelEntity::getId);

    private final ArmyCollectionRepository armyCollectionRepository;
    private final CollectionModelRepository collectionModelRepository;
    private final CollectionModelWargearSelectionRepository collectionModelWargearSelectionRepository;
    private final CollectionModelMagnetizedSlotRepository collectionModelMagnetizedSlotRepository;
    private final CollectionModelStatusEventRepository collectionModelStatusEventRepository;
    private final CollectionModelImageRepository collectionModelImageRepository;
    private final ModelDefinitionGroupPositionRepository modelDefinitionGroupPositionRepository;
    private final AttachmentSlotRepository attachmentSlotRepository;
    private final WargearOptionRepository wargearOptionRepository;
    private final PaintRecipeRepository paintRecipeRepository;
    private final FactionRepository factionRepository;
    private final UserRepository userRepository;
    private final PresignedUrlService presignedUrlService;
    private final ArmyCollectionsService armyCollectionsService;

    @Transactional(readOnly = true)
    public CollectionExport export(UUID userId, CollectionExportRequest request) {
        var requestedIds = request.getArmyCollectionIds();
        if (requestedIds == null || requestedIds.isEmpty()) {
            throw new BadRequestException("armyCollectionIds must contain at least one collection");
        }

        var distinctIds = new LinkedHashSet<>(requestedIds);
        Set<UUID> allowed = null;
        var miniatureIds = request.getCollectionModelIds();
        if (miniatureIds != null) {
            if (miniatureIds.isEmpty()) {
                throw new BadRequestException("collectionModelIds must not be empty");
            }
            if (distinctIds.size() != 1) {
                throw new BadRequestException("collectionModelIds requires exactly one collection");
            }
            allowed = new LinkedHashSet<>(miniatureIds);
        }

        for (var collectionId : distinctIds) {
            armyCollectionsService.requireOwnedArmyCollection(userId, collectionId);
        }

        var include = normaliseInclude(request.getInclude());
        var ownedInDisplayOrder =
                armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId).stream()
                        .filter(collection -> distinctIds.contains(collection.getId()))
                        .toList();

        var collections = new ArrayList<CollectionExportCollection>();
        for (var collection : ownedInDisplayOrder) {
            collections.add(exportCollection(collection, include, allowed));
        }

        return new CollectionExport(
                        CollectionExportSchema.CURRENT_VERSION,
                        OffsetDateTime.now(ZoneOffset.UTC),
                        include,
                        collections)
                .ownerDisplayName(ownerDisplayName(userId));
    }

    private CollectionExportCollection exportCollection(
            ArmyCollectionEntity collection, CollectionExportInclude include, Set<UUID> allowed) {
        var models = collectionModelRepository.findAllByArmyCollectionId(collection.getId());
        if (allowed != null) {
            var loadedIds =
                    models.stream().map(CollectionModelEntity::getId).collect(Collectors.toSet());
            for (var id : allowed) {
                if (!loadedIds.contains(id)) {
                    throw new NotFoundException("Collection model not found: " + id);
                }
            }
            models = models.stream().filter(model -> allowed.contains(model.getId())).toList();
        }
        var modelIds = models.stream().map(CollectionModelEntity::getId).toList();

        var selectionsByModelId =
                modelIds.isEmpty()
                        ? Map.<UUID, List<CollectionModelWargearSelectionEntity>>of()
                        : collectionModelWargearSelectionRepository
                                .findAllByCollectionModelIdIn(modelIds).stream()
                                .collect(
                                        Collectors.groupingBy(
                                                CollectionModelWargearSelectionEntity
                                                        ::getCollectionModelId));
        var magnetizedByModelId =
                modelIds.isEmpty()
                        ? Map.<UUID, List<CollectionModelMagnetizedSlotEntity>>of()
                        : collectionModelMagnetizedSlotRepository
                                .findAllByCollectionModelIdIn(modelIds).stream()
                                .collect(
                                        Collectors.groupingBy(
                                                CollectionModelMagnetizedSlotEntity
                                                        ::getCollectionModelId));
        var statusEventsByModelId =
                modelIds.isEmpty()
                        ? Map.<UUID, List<CollectionModelStatusEventEntity>>of()
                        : collectionModelStatusEventRepository
                                .findAllByCollectionModelIdIn(modelIds).stream()
                                .collect(
                                        Collectors.groupingBy(
                                                CollectionModelStatusEventEntity
                                                        ::getCollectionModelId));
        var imagesByModelId =
                modelIds.isEmpty()
                        ? Map.<UUID, List<CollectionModelImageEntity>>of()
                        : collectionModelImageRepository
                                .findAllByCollectionModelIdIn(modelIds).stream()
                                .collect(
                                        Collectors.groupingBy(
                                                CollectionModelImageEntity::getCollectionModelId));

        var recipes = paintRecipeRepository.findAllByArmyCollectionId(collection.getId());
        var collectionRecipe =
                recipes.stream()
                        .filter(recipe -> recipe.getScope() == PaintRecipeScope.COLLECTION)
                        .findFirst()
                        .orElse(null);
        var typeRecipesByDefinitionId =
                recipes.stream()
                        .filter(recipe -> recipe.getScope() == PaintRecipeScope.MODEL_TYPE)
                        .filter(recipe -> recipe.getModelDefinitionId() != null)
                        .collect(
                                Collectors.toMap(
                                        PaintRecipeEntity::getModelDefinitionId,
                                        recipe -> recipe,
                                        (a, b) -> a));
        var modelRecipesByModelId =
                recipes.stream()
                        .filter(recipe -> recipe.getScope() == PaintRecipeScope.MODEL)
                        .filter(recipe -> recipe.getCollectionModelId() != null)
                        .collect(
                                Collectors.toMap(
                                        PaintRecipeEntity::getCollectionModelId,
                                        recipe -> recipe,
                                        (a, b) -> a));

        var modelsByDefinitionId = new LinkedHashMap<UUID, List<CollectionModelEntity>>();
        for (var model : models) {
            var definitionId = model.getModelDefinition().getId();
            modelsByDefinitionId
                    .computeIfAbsent(definitionId, ignored -> new ArrayList<>())
                    .add(model);
        }

        var definitionIds = new ArrayList<>(modelsByDefinitionId.keySet());
        var slotsByDefinitionId =
                definitionIds.isEmpty()
                        ? Map.<UUID, List<AttachmentSlotEntity>>of()
                        : attachmentSlotRepository.findAllByModelDefinitionIdIn(definitionIds)
                                .stream()
                                .collect(
                                        Collectors.groupingBy(
                                                AttachmentSlotEntity::getModelDefinitionId));
        var optionsByDefinitionId =
                definitionIds.isEmpty()
                        ? Map.<UUID, List<WargearOptionEntity>>of()
                        : wargearOptionRepository.findAllByModelDefinitionIdIn(definitionIds)
                                .stream()
                                .collect(
                                        Collectors.groupingBy(
                                                WargearOptionEntity::getModelDefinitionId));

        var factionIds =
                models.stream()
                        .map(CollectionModelEntity::getModelDefinition)
                        .map(ModelDefinitionEntity::getFactionId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toCollection(LinkedHashSet::new));
        var factionNamesById =
                factionIds.isEmpty()
                        ? Map.<UUID, String>of()
                        : factionRepository.findAllById(factionIds).stream()
                                .collect(Collectors.toMap(FactionEntity::getId, FactionEntity::getName));

        var orderedDefinitionIds =
                orderModelDefinitionIds(
                        collection.getId(), modelsByDefinitionId, models);

        var modelTypes = new ArrayList<CollectionExportModelType>();
        for (var definitionId : orderedDefinitionIds) {
            var groupModels = modelsByDefinitionId.get(definitionId);
            var definition = groupModels.getFirst().getModelDefinition();
            modelTypes.add(
                    exportModelType(
                            definition,
                            groupModels,
                            include,
                            factionNamesById,
                            typeRecipesByDefinitionId.get(definitionId),
                            modelRecipesByModelId,
                            selectionsByModelId,
                            magnetizedByModelId,
                            statusEventsByModelId,
                            imagesByModelId,
                            slotsByDefinitionId.getOrDefault(definitionId, List.of()),
                            optionsByDefinitionId.getOrDefault(definitionId, List.of())));
        }

        var dto =
                new CollectionExportCollection(collection.getName(), models.size(), modelTypes);
        if (Boolean.TRUE.equals(include.getCollectionDescription())) {
            dto.setDescription(collection.getDescription());
        }
        if (Boolean.TRUE.equals(include.getStatus())) {
            dto.setStatusCounts(statusCounts(models));
        }
        if (Boolean.TRUE.equals(include.getPaintRecipes())) {
            dto.setPaintRecipe(toExportRecipe(collectionRecipe));
        }
        return dto;
    }

    private CollectionExportModelType exportModelType(
            ModelDefinitionEntity definition,
            List<CollectionModelEntity> models,
            CollectionExportInclude include,
            Map<UUID, String> factionNamesById,
            PaintRecipeEntity typeRecipe,
            Map<UUID, PaintRecipeEntity> modelRecipesByModelId,
            Map<UUID, List<CollectionModelWargearSelectionEntity>> selectionsByModelId,
            Map<UUID, List<CollectionModelMagnetizedSlotEntity>> magnetizedByModelId,
            Map<UUID, List<CollectionModelStatusEventEntity>> statusEventsByModelId,
            Map<UUID, List<CollectionModelImageEntity>> imagesByModelId,
            List<AttachmentSlotEntity> slots,
            List<WargearOptionEntity> options) {
        var sortedModels = models.stream().sorted(MINIATURE_NAME_ORDER).toList();
        var optionNames =
                options.stream()
                        .filter(option -> option.getWargearDefinition() != null)
                        .collect(
                                Collectors.toMap(
                                        WargearOptionEntity::getId,
                                        option -> option.getWargearDefinition().getName(),
                                        (a, b) -> a));
        var loadoutSlots =
                slots.stream()
                        .map(slot -> new LoadoutExportMapper.Slot(slot.getId(), slot.getName()))
                        .toList();

        var miniatures = new ArrayList<CollectionExportMiniature>();
        for (var model : sortedModels) {
            miniatures.add(
                    exportMiniature(
                            model,
                            include,
                            modelRecipesByModelId.get(model.getId()),
                            selectionsByModelId.getOrDefault(model.getId(), List.of()),
                            magnetizedByModelId.getOrDefault(model.getId(), List.of()),
                            statusEventsByModelId.getOrDefault(model.getId(), List.of()),
                            imagesByModelId.getOrDefault(model.getId(), List.of()),
                            loadoutSlots,
                            optionNames));
        }

        var dto = new CollectionExportModelType(definition.getName(), models.size(), miniatures);
        if (Boolean.TRUE.equals(include.getFaction()) && definition.getFactionId() != null) {
            dto.setFaction(factionNamesById.get(definition.getFactionId()));
        }
        if (Boolean.TRUE.equals(include.getStatus())) {
            dto.setStatusCounts(statusCounts(models));
        }
        if (Boolean.TRUE.equals(include.getPaintRecipes())) {
            dto.setPaintRecipe(toExportRecipe(typeRecipe));
        }
        return dto;
    }

    private CollectionExportMiniature exportMiniature(
            CollectionModelEntity model,
            CollectionExportInclude include,
            PaintRecipeEntity modelRecipe,
            List<CollectionModelWargearSelectionEntity> selections,
            List<CollectionModelMagnetizedSlotEntity> magnetizedSlots,
            List<CollectionModelStatusEventEntity> statusEvents,
            List<CollectionModelImageEntity> images,
            List<LoadoutExportMapper.Slot> slots,
            Map<UUID, String> optionNames) {
        var dto = new CollectionExportMiniature();

        if (Boolean.TRUE.equals(include.getMiniatureDetails())) {
            dto.setName(model.getName());
            dto.setDescription(model.getDescription());
        }

        if (Boolean.TRUE.equals(include.getStatus())) {
            var status = model.getStatus() == null ? CollectionModelStatus.BOXED : model.getStatus();
            dto.setStatus(status.name());
            var historyNewestFirst =
                    statusEvents.stream()
                            .sorted(
                                    Comparator.comparing(
                                                    CollectionModelStatusEventEntity::getChangedAt)
                                            .reversed())
                            .toList();
            if (!historyNewestFirst.isEmpty()) {
                dto.setStatusChangedAt(toOffset(historyNewestFirst.getFirst().getChangedAt()));
            }
            if (Boolean.TRUE.equals(include.getStatusHistory())) {
                dto.setStatusHistory(
                        historyNewestFirst.stream()
                                .map(
                                        event ->
                                                new CollectionExportStatusEvent(
                                                        event.getStatus().name(),
                                                        toOffset(event.getChangedAt())))
                                .toList());
            }
        }

        if (Boolean.TRUE.equals(include.getWargear())) {
            var loadoutSelections =
                    selections.stream()
                            .map(
                                    selection ->
                                            new LoadoutExportMapper.Selection(
                                                    selection.getAttachmentSlotId(),
                                                    selection.getWargearOptionId(),
                                                    selection.getCustomLabel(),
                                                    selection.getLinkGroupId(),
                                                    selection.isEquipped()))
                            .toList();
            var magnetizedSlotIds =
                    magnetizedSlots.stream()
                            .map(CollectionModelMagnetizedSlotEntity::getAttachmentSlotId)
                            .collect(Collectors.toCollection(HashSet::new));
            dto.setLoadout(
                    LoadoutExportMapper.map(
                            slots,
                            loadoutSelections,
                            magnetizedSlotIds,
                            optionNames,
                            Boolean.TRUE.equals(include.getSpareBits())));
        }

        if (Boolean.TRUE.equals(include.getPaintRecipes())) {
            dto.setPaintRecipe(toExportRecipe(modelRecipe));
        }

        if (Boolean.TRUE.equals(include.getThumbnails())) {
            dto.setThumbnailUrl(thumbnailUrl(images));
        }

        return dto;
    }

    private java.net.URI thumbnailUrl(List<CollectionModelImageEntity> images) {
        return images.stream()
                .sorted(IMAGE_DISPLAY_ORDER)
                .map(CollectionModelImageEntity::getThumbnail)
                .filter(Objects::nonNull)
                .map(variant -> variant.getStorageKey())
                .filter(Objects::nonNull)
                .findFirst()
                .map(presignedUrlService::presignDownload)
                .orElse(null);
    }

    private List<UUID> orderModelDefinitionIds(
            UUID armyCollectionId,
            Map<UUID, List<CollectionModelEntity>> modelsByDefinitionId,
            List<CollectionModelEntity> models) {
        var orderedIds =
                modelDefinitionGroupPositionRepository
                        .findByArmyCollectionIdOrderByDisplayOrderAsc(armyCollectionId)
                        .stream()
                        .map(ModelDefinitionGroupPositionEntity::getModelDefinitionId)
                        .filter(modelsByDefinitionId::containsKey)
                        .toList();

        var remaining = new HashSet<>(modelsByDefinitionId.keySet());
        orderedIds.forEach(remaining::remove);

        var namesByDefinitionId = new HashMap<UUID, String>();
        for (var model : models) {
            namesByDefinitionId.putIfAbsent(
                    model.getModelDefinition().getId(), model.getModelDefinition().getName());
        }

        var unordered =
                remaining.stream()
                        .sorted(
                                Comparator.comparing(
                                        id ->
                                                namesByDefinitionId
                                                        .getOrDefault(id, "")
                                                        .toLowerCase(Locale.ROOT)))
                        .toList();

        var result = new ArrayList<UUID>(orderedIds.size() + unordered.size());
        result.addAll(orderedIds);
        result.addAll(unordered);
        return result;
    }

    private static Map<String, Integer> statusCounts(List<CollectionModelEntity> models) {
        var counts = new LinkedHashMap<String, Integer>();
        for (var model : models) {
            var status = model.getStatus() == null ? CollectionModelStatus.BOXED : model.getStatus();
            counts.merge(status.name(), 1, Integer::sum);
        }
        return counts.isEmpty() ? null : counts;
    }

    private static CollectionExportPaintRecipe toExportRecipe(PaintRecipeEntity recipe) {
        if (recipe == null) {
            return null;
        }
        var paints =
                recipe.getPaints().stream()
                        .sorted(
                                Comparator.comparing(
                                        PaintRecipePaintEntity::getPosition,
                                        Comparator.nullsLast(Comparator.naturalOrder())))
                        .map(CollectionExportService::toExportPaint)
                        .toList();
        return new CollectionExportPaintRecipe(paints).notes(recipe.getNotes());
    }

    private static CollectionExportPaint toExportPaint(PaintRecipePaintEntity entry) {
        var paint = entry.getPaint();
        var dto = new CollectionExportPaint(paint.getName());
        dto.setBrand(paint.getBrand());
        if (paint.getPaintType() != null) {
            dto.setPaintType(
                    CollectionExportPaint.PaintTypeEnum.fromValue(paint.getPaintType().name()));
        }
        dto.setHexColour(paint.getHexColour());
        dto.setStep(entry.getStepLabel());
        dto.setNote(entry.getNote());
        return dto;
    }

    private static CollectionExportInclude normaliseInclude(CollectionExportInclude include) {
        var source = include == null ? new CollectionExportInclude() : include;
        var wargear = Boolean.TRUE.equals(source.getWargear());
        var status = Boolean.TRUE.equals(source.getStatus());
        return new CollectionExportInclude()
                .collectionDescription(Boolean.TRUE.equals(source.getCollectionDescription()))
                .faction(Boolean.TRUE.equals(source.getFaction()))
                .status(status)
                .statusHistory(status && Boolean.TRUE.equals(source.getStatusHistory()))
                .wargear(wargear)
                .spareBits(wargear && Boolean.TRUE.equals(source.getSpareBits()))
                .paintRecipes(Boolean.TRUE.equals(source.getPaintRecipes()))
                .miniatureDetails(Boolean.TRUE.equals(source.getMiniatureDetails()))
                .thumbnails(Boolean.TRUE.equals(source.getThumbnails()));
    }

    private String ownerDisplayName(UUID userId) {
        return userRepository
                .findById(userId)
                .map(User::getDisplayName)
                .filter(name -> name != null && !name.isBlank())
                .orElse(null);
    }

    private static OffsetDateTime toOffset(Instant instant) {
        return instant == null ? null : instant.atOffset(ZoneOffset.UTC);
    }
}

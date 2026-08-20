package com.keith.battlereadyshelf.armycollection;

import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelStatus;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.ArmyCollection;
import com.keith.battlereadyshelf.user.User;
import com.keith.battlereadyshelf.user.UserRepository;

import lombok.RequiredArgsConstructor;

import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ArmyCollectionsService {
    private final ArmyCollectionRepository armyCollectionRepository;
    private final CollectionModelRepository collectionModelRepository;
    private final ModelDefinitionGroupPositionRepository modelDefinitionGroupPositionRepository;
    private final UserRepository userRepository;
    private final ArmyCollectionMapper armyCollectionMapper;

    public List<ArmyCollection> getAllArmyCollections(UUID userId) {
        var armyCollections =
                armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId);
        var armyCollectionIds = armyCollections.stream().map(ArmyCollectionEntity::getId).toList();
        var countsByCollectionId = countModelsByStatus(armyCollectionIds);
        var usersById = getUsersById(userId);

        return armyCollections.stream()
                .map(entity -> toDtoWithCounts(entity, countsByCollectionId, usersById))
                .toList();
    }

    public List<ArmyCollection> getAllPublicArmyCollections() {
        var armyCollections = armyCollectionRepository.findAllByIsPublicTrueOrderByNameAsc();
        var armyCollectionIds = armyCollections.stream().map(ArmyCollectionEntity::getId).toList();
        var countsByCollectionId = countModelsByStatus(armyCollectionIds);
        var userIds =
                armyCollections.stream().map(ArmyCollectionEntity::getUserId).distinct().toList();
        var usersById =
                userRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(User::getId, user -> user));

        return armyCollections.stream()
                .map(entity -> toDtoWithCounts(entity, countsByCollectionId, usersById))
                .toList();
    }

    @Transactional
    public ArmyCollection createArmyCollection(UUID userId, ArmyCollection armyCollection) {
        var nextDisplayOrder =
                armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId).stream()
                                .mapToInt(ArmyCollectionEntity::getDisplayOrder)
                                .max()
                                .orElse(-1)
                        + 1;

        var entity = armyCollectionMapper.toEntity(userId, armyCollection);
        if (entity.getIsPublic() == null) {
            entity.setIsPublic(false);
        }
        entity.setDisplayOrder(nextDisplayOrder);
        var savedArmyCollection = armyCollectionRepository.save(entity);

        var usersById = getUsersById(userId);
        return toDtoWithCounts(savedArmyCollection, Map.of(), usersById);
    }

    public ArmyCollection getArmyCollection(UUID userId, UUID armyCollectionId) {
        var armyCollection = requireViewableArmyCollection(userId, armyCollectionId);
        var countsByCollectionId = countModelsByStatus(List.of(armyCollectionId));
        var usersById = getUsersById(armyCollection.getUserId());
        return toDtoWithCounts(armyCollection, countsByCollectionId, usersById);
    }

    /** Renames/updates the name, description, and/or visibility of an existing army collection. */
    @Transactional
    public ArmyCollection updateArmyCollection(
            UUID userId, UUID armyCollectionId, String name, String description, Boolean isPublic) {
        var armyCollection = requireOwnedArmyCollection(userId, armyCollectionId);

        if (name != null) {
            armyCollection.setName(name);
        }
        if (description != null) {
            armyCollection.setDescription(description);
        }
        if (isPublic != null) {
            armyCollection.setIsPublic(isPublic);
        }

        var saved = armyCollectionRepository.save(armyCollection);
        var countsByCollectionId = countModelsByStatus(List.of(armyCollectionId));
        var usersById = getUsersById(userId);
        return toDtoWithCounts(saved, countsByCollectionId, usersById);
    }

    /**
     * Persists a new display order for all of the current user's army collections (drag-to-reorder
     * on the Collections page). {@code orderedArmyCollectionIds} must contain exactly the set of
     * the user's existing army collection ids, in the desired order.
     */
    @Transactional
    public List<ArmyCollection> reorderArmyCollections(
            UUID userId, List<UUID> orderedArmyCollectionIds) {
        var existing = armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId);
        var existingIds =
                existing.stream().map(ArmyCollectionEntity::getId).collect(Collectors.toSet());
        var givenIds = new HashSet<>(orderedArmyCollectionIds);

        if (!existingIds.equals(givenIds)
                || existingIds.size() != orderedArmyCollectionIds.size()) {
            throw new BadRequestException(
                    "The given army collection ids must match exactly the current user's existing"
                            + " army collection ids, with no duplicates.");
        }

        var entitiesById =
                existing.stream().collect(Collectors.toMap(ArmyCollectionEntity::getId, e -> e));
        for (var i = 0; i < orderedArmyCollectionIds.size(); i++) {
            entitiesById.get(orderedArmyCollectionIds.get(i)).setDisplayOrder(i);
        }

        var saved = armyCollectionRepository.saveAll(existing);
        var countsByCollectionId = countModelsByStatus(orderedArmyCollectionIds);
        var savedById =
                saved.stream().collect(Collectors.toMap(ArmyCollectionEntity::getId, e -> e));
        var usersById = getUsersById(userId);

        return orderedArmyCollectionIds.stream()
                .map(id -> toDtoWithCounts(savedById.get(id), countsByCollectionId, usersById))
                .toList();
    }

    /**
     * Persists a new display order for the model-definition groups (accordion sections) shown
     * within a single army collection's model list. Replaces any previously stored order for this
     * collection.
     */
    @Transactional
    public ArmyCollection reorderModelDefinitionGroups(
            UUID userId, UUID armyCollectionId, List<UUID> orderedModelDefinitionIds) {
        var armyCollection = requireOwnedArmyCollection(userId, armyCollectionId);

        modelDefinitionGroupPositionRepository.deleteByArmyCollectionId(armyCollectionId);
        var positions =
                orderedModelDefinitionIds.stream()
                        .distinct()
                        .map(
                                modelDefinitionId ->
                                        ModelDefinitionGroupPositionEntity.builder()
                                                .armyCollectionId(armyCollectionId)
                                                .modelDefinitionId(modelDefinitionId)
                                                .displayOrder(
                                                        orderedModelDefinitionIds.indexOf(
                                                                modelDefinitionId))
                                                .build())
                        .toList();
        modelDefinitionGroupPositionRepository.saveAll(positions);

        var countsByCollectionId = countModelsByStatus(List.of(armyCollectionId));
        var usersById = getUsersById(userId);
        return toDtoWithCounts(armyCollection, countsByCollectionId, usersById);
    }

    /**
     * Maps an army collection entity to a DTO, filling in the total model count, per-status
     * breakdown, model-definition group order, and creator user display name.
     */
    private ArmyCollection toDtoWithCounts(
            ArmyCollectionEntity entity,
            Map<UUID, Map<CollectionModelStatus, Long>> countsByCollectionId,
            Map<UUID, User> usersById) {
        var dto = armyCollectionMapper.toDto(entity);
        var statusCounts = countsByCollectionId.getOrDefault(entity.getId(), Map.of());

        dto.setModelCount(statusCounts.values().stream().mapToInt(Long::intValue).sum());
        dto.setModelCountsByStatus(
                statusCounts.entrySet().stream()
                        .collect(
                                Collectors.toMap(
                                        e -> e.getKey().name(), e -> e.getValue().intValue())));
        dto.setModelDefinitionOrder(
                modelDefinitionGroupPositionRepository
                        .findByArmyCollectionIdOrderByDisplayOrderAsc(entity.getId())
                        .stream()
                        .map(ModelDefinitionGroupPositionEntity::getModelDefinitionId)
                        .toList());

        var user = usersById.get(entity.getUserId());
        if (user != null) {
            var displayName = user.getDisplayName();
            if (displayName != null && !displayName.isBlank()) {
                dto.setUserDisplayName(displayName);
            }
        }

        return dto;
    }

    /** Counts collection models per status, grouped by army collection id, for the given ids. */
    private Map<UUID, Map<CollectionModelStatus, Long>> countModelsByStatus(
            List<UUID> armyCollectionIds) {
        if (armyCollectionIds.isEmpty()) {
            return Map.of();
        }

        var result = new HashMap<UUID, Map<CollectionModelStatus, Long>>();
        for (var row :
                collectionModelRepository.countByArmyCollectionIdInGroupByStatus(
                        armyCollectionIds)) {
            result.computeIfAbsent(row.getArmyCollectionId(), id -> new HashMap<>())
                    .put(row.getStatus(), row.getCount());
        }
        return result;
    }

    public ArmyCollectionEntity requireOwnedArmyCollection(UUID userId, UUID armyCollectionId) {
        var armyCollection =
                armyCollectionRepository
                        .findById(armyCollectionId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Army collection not found: " + armyCollectionId));

        if (!armyCollection.getUserId().equals(userId)) {
            throw new NotFoundException("Army collection not found: " + armyCollectionId);
        }

        return armyCollection;
    }

    public ArmyCollectionEntity requireViewableArmyCollection(UUID userId, UUID armyCollectionId) {
        var armyCollection =
                armyCollectionRepository
                        .findById(armyCollectionId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Army collection not found: " + armyCollectionId));

        if (!Boolean.TRUE.equals(armyCollection.getIsPublic())
                && (!armyCollection.getUserId().equals(userId))) {
            throw new NotFoundException("Army collection not found: " + armyCollectionId);
        }

        return armyCollection;
    }

    private @NonNull Map<UUID, User> getUsersById(UUID userId) {
        var user = userRepository.findById(userId).orElse(null);
        return user != null ? Map.of(user.getId(), user) : Map.of();
    }
}

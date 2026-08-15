package com.keith.battlereadyshelf.armycollection;

import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelStatus;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.ArmyCollection;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ArmyCollectionsService {
    private final ArmyCollectionRepository armyCollectionRepository;
    private final CollectionModelRepository collectionModelRepository;
    private final ArmyCollectionMapper armyCollectionMapper;

    public List<ArmyCollection> getAllArmyCollections(UUID userId) {
        var armyCollections = armyCollectionRepository.findAllByUserId(userId);
        var armyCollectionIds = armyCollections.stream().map(ArmyCollectionEntity::getId).toList();
        var countsByCollectionId = countModelsByStatus(armyCollectionIds);

        return armyCollections.stream()
                .map(entity -> toDtoWithCounts(entity, countsByCollectionId))
                .toList();
    }

    public ArmyCollection createArmyCollection(UUID userId, ArmyCollection armyCollection) {
        var savedArmyCollection =
                armyCollectionRepository.save(
                        armyCollectionMapper.toEntity(userId, armyCollection));

        return toDtoWithCounts(savedArmyCollection, Map.of());
    }

    public ArmyCollection getArmyCollection(UUID userId, UUID armyCollectionId) {
        var armyCollection = requireOwnedArmyCollection(userId, armyCollectionId);
        var countsByCollectionId = countModelsByStatus(List.of(armyCollectionId));
        return toDtoWithCounts(armyCollection, countsByCollectionId);
    }

    /** Renames/updates the name and/or description of an existing army collection. */
    public ArmyCollection updateArmyCollection(
            UUID userId, UUID armyCollectionId, String name, String description) {
        var armyCollection = requireOwnedArmyCollection(userId, armyCollectionId);

        if (name != null) {
            armyCollection.setName(name);
        }
        if (description != null) {
            armyCollection.setDescription(description);
        }

        var saved = armyCollectionRepository.save(armyCollection);
        var countsByCollectionId = countModelsByStatus(List.of(armyCollectionId));
        return toDtoWithCounts(saved, countsByCollectionId);
    }

    /**
     * Maps an army collection entity to a DTO, filling in the total model count and per-status
     * breakdown from the pre-fetched counts (keyed by army collection id).
     */
    private ArmyCollection toDtoWithCounts(
            ArmyCollectionEntity entity, Map<UUID, Map<CollectionModelStatus, Long>> countsByCollectionId) {
        var dto = armyCollectionMapper.toDto(entity);
        var statusCounts = countsByCollectionId.getOrDefault(entity.getId(), Map.of());

        dto.setModelCount(statusCounts.values().stream().mapToInt(Long::intValue).sum());
        dto.setModelCountsByStatus(
                statusCounts.entrySet().stream()
                        .collect(Collectors.toMap(e -> e.getKey().name(), e -> e.getValue().intValue())));

        return dto;
    }

    /** Counts collection models per status, grouped by army collection id, for the given ids. */
    private Map<UUID, Map<CollectionModelStatus, Long>> countModelsByStatus(List<UUID> armyCollectionIds) {
        if (armyCollectionIds.isEmpty()) {
            return Map.of();
        }

        var result = new HashMap<UUID, Map<CollectionModelStatus, Long>>();
        for (var row : collectionModelRepository.countByArmyCollectionIdInGroupByStatus(armyCollectionIds)) {
            result
                    .computeIfAbsent(row.getArmyCollectionId(), id -> new HashMap<>())
                    .put(row.getStatus(), row.getCount());
        }
        return result;
    }

    private ArmyCollectionEntity requireOwnedArmyCollection(UUID userId, UUID armyCollectionId) {
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
}

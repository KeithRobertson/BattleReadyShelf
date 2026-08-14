package com.keith.battlereadyshelf.armycollection;

import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.ArmyCollection;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ArmyCollectionsService {
    private final ArmyCollectionRepository armyCollectionRepository;
    private final ArmyCollectionMapper armyCollectionMapper;

    public List<ArmyCollection> getAllArmyCollections(UUID userId) {
        return armyCollectionRepository.findAllByUserId(userId).stream()
                .map(armyCollectionMapper::toDto)
                .toList();
    }

    public ArmyCollection createArmyCollection(UUID userId, ArmyCollection armyCollection) {
        var savedArmyCollection =
                armyCollectionRepository.save(
                        armyCollectionMapper.toEntity(userId, armyCollection));

        return armyCollectionMapper.toDto(savedArmyCollection);
    }

    public ArmyCollection getArmyCollection(UUID userId, UUID armyCollectionId) {
        return armyCollectionMapper.toDto(requireOwnedArmyCollection(userId, armyCollectionId));
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

        return armyCollectionMapper.toDto(armyCollectionRepository.save(armyCollection));
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

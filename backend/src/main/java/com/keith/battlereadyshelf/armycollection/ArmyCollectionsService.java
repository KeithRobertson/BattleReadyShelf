package com.keith.battlereadyshelf.armycollection;

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
}

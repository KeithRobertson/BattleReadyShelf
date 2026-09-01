package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.WargearDefinition;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Administration of the shared wargear catalogue. Because a definition is referenced rather than
 * copied, renaming one here immediately renames it on every model definition that uses it, which
 * is the whole point of storing wargear this way.
 */
@Service
@RequiredArgsConstructor
public class WargearDefinitionService {
    private final WargearDefinitionRepository wargearDefinitionRepository;
    private final WargearOptionRepository wargearOptionRepository;

    public List<WargearDefinition> getAllWargearDefinitions() {
        Map<UUID, Long> usageCounts =
                wargearOptionRepository.findAll().stream()
                        .collect(
                                Collectors.groupingBy(
                                        option -> option.getWargearDefinition().getId(),
                                        Collectors.counting()));

        return wargearDefinitionRepository.findAll().stream()
                .sorted(Comparator.comparing(WargearDefinitionEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .map(definition -> toDto(definition, usageCounts.getOrDefault(definition.getId(), 0L)))
                .toList();
    }

    @Transactional
    public WargearDefinition renameWargearDefinition(UUID wargearDefinitionId, String name) {
        var definition =
                wargearDefinitionRepository
                        .findById(wargearDefinitionId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Wargear definition not found: " + wargearDefinitionId));
        definition.setName(name);
        var saved = wargearDefinitionRepository.save(definition);

        var usageCount =
                wargearOptionRepository.findAll().stream()
                        .filter(option -> option.getWargearDefinition().getId().equals(saved.getId()))
                        .count();
        return toDto(saved, usageCount);
    }

    private WargearDefinition toDto(WargearDefinitionEntity entity, long usageCount) {
        return new WargearDefinition(entity.getName())
                .id(entity.getId())
                .externalId(entity.getExternalId())
                .usageCount(Math.toIntExact(usageCount));
    }
}

package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.generated.model.AttachmentSlot;
import com.keith.battlereadyshelf.generated.model.ModelDefinition;
import com.keith.battlereadyshelf.generated.model.WargearOption;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModelDefinitionsService {
    private final ModelDefinitionRepository modelDefinitionRepository;
    private final AttachmentSlotRepository attachmentSlotRepository;
    private final WargearOptionRepository wargearOptionRepository;
    private final ModelDefinitionMapper modelDefinitionMapper;

    public List<ModelDefinition> getAllModelDefinitions() {
        var modelDefinitionEntities = modelDefinitionRepository.findAll();
        var modelDefinitionIds = modelDefinitionEntities.stream().map(ModelDefinitionEntity::getId).toList();

        Map<UUID, List<AttachmentSlot>> attachmentSlotsByModelDefinitionId =
                attachmentSlotRepository.findAllByModelDefinitionIdIn(modelDefinitionIds).stream()
                        .collect(
                                Collectors.groupingBy(
                                        AttachmentSlotEntity::getModelDefinitionId,
                                        Collectors.mapping(
                                                modelDefinitionMapper::toDto, Collectors.toList())));

        Map<UUID, List<WargearOption>> wargearOptionsByModelDefinitionId =
                wargearOptionRepository.findAllByModelDefinitionIdIn(modelDefinitionIds).stream()
                        .collect(
                                Collectors.groupingBy(
                                        WargearOptionEntity::getModelDefinitionId,
                                        Collectors.mapping(
                                                modelDefinitionMapper::toDto, Collectors.toList())));

        return modelDefinitionEntities.stream()
                .map(
                        entity ->
                                modelDefinitionMapper
                                        .toDto(entity)
                                        .attachmentSlots(
                                                attachmentSlotsByModelDefinitionId.getOrDefault(
                                                        entity.getId(), List.of()))
                                        .wargearOptions(
                                                wargearOptionsByModelDefinitionId.getOrDefault(
                                                        entity.getId(), List.of())))
                .toList();
    }
}

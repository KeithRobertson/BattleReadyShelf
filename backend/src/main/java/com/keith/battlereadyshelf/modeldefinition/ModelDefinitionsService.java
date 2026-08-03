package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.generated.model.ModelDefinition;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ModelDefinitionsService {
    private final ModelDefinitionRepository modelDefinitionRepository;
    private final ModelDefinitionMapper modelDefinitionMapper;

    public List<ModelDefinition> getAllModelDefinitions() {
        return modelDefinitionRepository.findAll().stream()
                .map(modelDefinitionMapper::toDto)
                .toList();
    }
}

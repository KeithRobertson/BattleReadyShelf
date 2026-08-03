package com.keith.battlereadyshelf.modeldefinition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.generated.model.ModelDefinition;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class ModelDefinitionsServiceTest {
    @Mock private ModelDefinitionRepository modelDefinitionRepository;

    private ModelDefinitionsService modelDefinitionsService;

    @BeforeEach
    void setUp() {
        modelDefinitionsService =
                new ModelDefinitionsService(
                        modelDefinitionRepository, new ModelDefinitionMapperImpl());
    }

    @Test
    void getAllModelDefinitions_returnsAllModelDefinitions() {
        var poxwalkerId = UUID.randomUUID();
        when(modelDefinitionRepository.findAll())
                .thenReturn(
                        List.of(
                                ModelDefinitionEntity.builder()
                                        .id(poxwalkerId)
                                        .name("Poxwalker")
                                        .build()));

        var modelDefinitions = modelDefinitionsService.getAllModelDefinitions();

        assertThat(modelDefinitions)
                .containsExactly(new ModelDefinition("Poxwalker").id(poxwalkerId));
    }
}

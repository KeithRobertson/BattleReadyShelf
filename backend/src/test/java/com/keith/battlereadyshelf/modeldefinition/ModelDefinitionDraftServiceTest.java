package com.keith.battlereadyshelf.modeldefinition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keith.battlereadyshelf.factiondefinition.FactionEntity;
import com.keith.battlereadyshelf.factiondefinition.FactionRepository;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionDraft;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExport;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExportItem;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;
import com.keith.battlereadyshelf.user.Role;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class ModelDefinitionDraftServiceTest {
    @Mock private ModelDefinitionRepository modelDefinitionRepository;
    @Mock private AttachmentSlotRepository attachmentSlotRepository;
    @Mock private WargearOptionRepository wargearOptionRepository;
    @Mock private FactionRepository factionRepository;
    @Mock private ModelDefinitionDraftRepository modelDefinitionDraftRepository;
    @Mock private AttachmentSlotDraftRepository attachmentSlotDraftRepository;
    @Mock private WargearOptionDraftRepository wargearOptionDraftRepository;
    @Mock private ModelDefinitionPublishAuditRepository modelDefinitionPublishAuditRepository;
    @Mock private ModelDefinitionMapper modelDefinitionMapper;
    @Mock private ObjectMapper objectMapper;

    private ModelDefinitionDraftService service;

    @BeforeEach
    void setUp() {
        service =
                new ModelDefinitionDraftService(
                        modelDefinitionRepository,
                        attachmentSlotRepository,
                        wargearOptionRepository,
                        factionRepository,
                        modelDefinitionDraftRepository,
                        attachmentSlotDraftRepository,
                        wargearOptionDraftRepository,
                        modelDefinitionPublishAuditRepository,
                        modelDefinitionMapper,
                        objectMapper);
    }

    @Test
    void exportUsesDatasetSourceSchemaAndStableIdReferences() {
        var factionId = UUID.randomUUID();
        var modelId = UUID.randomUUID();
        var slotId = UUID.randomUUID();
        var optionId = UUID.randomUUID();

        var faction =
                FactionEntity.builder()
                        .id(factionId)
                        .externalId("death_guard")
                        .name("Death Guard")
                        .build();
        var model =
                ModelDefinitionEntity.builder()
                        .id(modelId)
                        .externalId("death_guard_plague_marine")
                        .factionId(factionId)
                        .name("Plague Marine")
                        .build();
        var slot =
                AttachmentSlotEntity.builder()
                        .id(slotId)
                        .modelDefinitionId(modelId)
                        .externalId("left_arm")
                        .name("Left Arm")
                        .type("arm")
                        .build();
        var option =
                WargearOptionEntity.builder()
                        .id(optionId)
                        .modelDefinitionId(modelId)
                        .externalId("boltgun")
                        .name("Boltgun")
                        .isDefault(true)
                        .attachmentSlots(List.of(slot))
                        .build();

        when(factionRepository.findAll()).thenReturn(List.of(faction));
        when(modelDefinitionRepository.findAll()).thenReturn(List.of(model));
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(modelId)))
                .thenReturn(List.of(slot));
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(modelId)))
                .thenReturn(List.of(option));

        var result = service.exportModelDefinitions();

        assertThat(result.getSchemaVersion()).isEqualTo(3);
        assertThat(result.getFactions()).singleElement().satisfies(
                item -> {
                    assertThat(item.getId()).isEqualTo("death_guard");
                    assertThat(item.getName()).isEqualTo("Death Guard");
                });
        assertThat(result.getModelDefinitions()).singleElement().satisfies(
                item -> {
                    assertThat(item.getId()).isEqualTo("death_guard_plague_marine");
                    assertThat(item.getFactionId()).isEqualTo("death_guard");
                    assertThat(item.getAttachmentSlots()).singleElement().satisfies(
                            exportedSlot -> {
                                assertThat(exportedSlot.getId()).isEqualTo("left_arm");
                                assertThat(exportedSlot.getType()).isEqualTo("arm");
                            });
                    assertThat(item.getWargearOptions()).singleElement().satisfies(
                            exportedOption -> {
                                assertThat(exportedOption.getId()).isEqualTo("boltgun");
                                assertThat(exportedOption.getSlotIds()).containsExactly("left_arm");
                            });
                });
    }

    @Test
    void exportDerivesStableSourceIdsForHandAuthoredDefinitions() {
        var modelId = UUID.randomUUID();
        var slotId = UUID.randomUUID();
        var optionId = UUID.randomUUID();
        var model = ModelDefinitionEntity.builder().id(modelId).name("Custom Model").build();
        var slot =
                AttachmentSlotEntity.builder()
                        .id(slotId)
                        .modelDefinitionId(modelId)
                        .name("Arm")
                        .type("other")
                        .build();
        var option =
                WargearOptionEntity.builder()
                        .id(optionId)
                        .modelDefinitionId(modelId)
                        .name("Custom Weapon")
                        .attachmentSlots(List.of(slot))
                        .build();

        when(factionRepository.findAll()).thenReturn(List.of());
        when(modelDefinitionRepository.findAll()).thenReturn(List.of(model));
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(modelId)))
                .thenReturn(List.of(slot));
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(modelId)))
                .thenReturn(List.of(option));

        var exported = service.exportModelDefinitions().getModelDefinitions().getFirst();

        assertThat(exported.getId()).isEqualTo(modelId.toString());
        assertThat(exported.getAttachmentSlots().getFirst().getId()).isEqualTo(slotId.toString());
        assertThat(exported.getWargearOptions().getFirst().getId()).isEqualTo(optionId.toString());
        assertThat(exported.getWargearOptions().getFirst().getSlotIds())
                .containsExactly(slotId.toString());
    }

    @Test
    void importAllowsDuplicateModelDefinitionNames() {
        var export =
                new ModelDefinitionExport(
                        3,
                        List.of(),
                        List.of(
                                exportItem("aeldari_fire_dragon", "Fire Dragon"),
                                exportItem("warcry_fire_dragon", "Fire Dragon")));

        when(modelDefinitionRepository.findAll()).thenReturn(List.of());
        when(modelDefinitionDraftRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            ModelDefinitionDraftEntity draft = invocation.getArgument(0);
                            if (draft.getId() == null) {
                                draft.setId(UUID.randomUUID());
                            }
                            return draft;
                        });
        when(modelDefinitionDraftRepository.findById(any()))
                .thenAnswer(
                        invocation ->
                                Optional.of(
                                        ModelDefinitionDraftEntity.builder()
                                                .id(invocation.getArgument(0))
                                                .name("Fire Dragon")
                                                .build()));
        when(attachmentSlotDraftRepository.findAllByModelDefinitionDraftId(any()))
                .thenReturn(List.of());
        when(wargearOptionDraftRepository.findAllByModelDefinitionDraftId(any()))
                .thenReturn(List.of());
        when(modelDefinitionMapper.toDto(any(ModelDefinitionDraftEntity.class)))
                .thenAnswer(
                        invocation -> {
                            ModelDefinitionDraftEntity draft = invocation.getArgument(0);
                            return new ModelDefinitionDraft(draft.getName(), List.of(), List.of());
                        });

        var drafts = service.importModelDefinitions(currentUser(), export);

        assertThat(drafts).hasSize(2);
        assertThat(drafts).allSatisfy(d -> assertThat(d.getName()).isEqualTo("Fire Dragon"));
    }

    private static ModelDefinitionExportItem exportItem(String sourceId, String name) {
        return new ModelDefinitionExportItem(sourceId, null, name, List.of(), List.of());
    }

    private static CurrentAuthenticatedUser currentUser() {
        return new CurrentAuthenticatedUser(
                UUID.randomUUID(), "admin@example.com", Role.ADMIN, Instant.now(), null);
    }
}

package com.keith.battlereadyshelf.modeldefinition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keith.battlereadyshelf.factiondefinition.FactionEntity;
import com.keith.battlereadyshelf.factiondefinition.FactionRepository;
import com.keith.battlereadyshelf.generated.model.FactionExportItem;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionDraft;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExport;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExportItem;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExportItemAttachmentSlotsInner;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExportItemWargearOptionsInner;
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

    @Test
    void importSkipsDefinitionsAlreadyMatchingThePublishedState() {
        var factionId = UUID.randomUUID();
        var modelId = UUID.randomUUID();
        var slotId = UUID.randomUUID();
        var optionId = UUID.randomUUID();

        var faction =
                FactionEntity.builder().id(factionId).externalId("aeldari").name("Aeldari").build();
        var published =
                ModelDefinitionEntity.builder()
                        .id(modelId)
                        .externalId("aeldari_fire_dragon")
                        .factionId(factionId)
                        .name("Fire Dragon")
                        .build();
        var slot =
                AttachmentSlotEntity.builder()
                        .id(slotId)
                        .modelDefinitionId(modelId)
                        .externalId("weapon")
                        .name("Weapon")
                        .type("weapon")
                        .build();
        var option =
                WargearOptionEntity.builder()
                        .id(optionId)
                        .modelDefinitionId(modelId)
                        .externalId("fusion_gun")
                        .name("Fusion Gun")
                        .isDefault(true)
                        .attachmentSlots(List.of(slot))
                        .build();

        when(factionRepository.findAll()).thenReturn(List.of(faction));
        when(factionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(modelDefinitionRepository.findAll()).thenReturn(List.of(published));
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of());
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(modelId)))
                .thenReturn(List.of(slot));
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(modelId)))
                .thenReturn(List.of(option));

        var export =
                new ModelDefinitionExport(
                        3,
                        List.of(new FactionExportItem("aeldari", "Aeldari")),
                        List.of(
                                new ModelDefinitionExportItem(
                                        "aeldari_fire_dragon",
                                        "aeldari",
                                        "Fire Dragon",
                                        List.of(
                                                new ModelDefinitionExportItemAttachmentSlotsInner(
                                                        "weapon", "Weapon", "weapon")),
                                        List.of(
                                                new ModelDefinitionExportItemWargearOptionsInner(
                                                        "fusion_gun",
                                                        "Fusion Gun",
                                                        true,
                                                        List.of("weapon"))))));

        assertThat(service.importModelDefinitions(currentUser(), export)).isEmpty();
        verify(modelDefinitionDraftRepository, never()).save(any());
    }

    @Test
    void importReusesAnOpenDraftInsteadOfCreatingASecondOne() {
        var draftId = UUID.randomUUID();
        var draft =
                ModelDefinitionDraftEntity.builder()
                        .id(draftId)
                        .externalId("aeldari_fire_dragon")
                        .name("Fire Dragon")
                        .build();

        when(modelDefinitionRepository.findAll()).thenReturn(List.of());
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of(draft));
        when(modelDefinitionDraftRepository.findById(draftId)).thenReturn(Optional.of(draft));
        when(modelDefinitionDraftRepository.save(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(modelDefinitionMapper.toDto(any(ModelDefinitionDraftEntity.class)))
                .thenAnswer(
                        invocation -> {
                            ModelDefinitionDraftEntity d = invocation.getArgument(0);
                            return new ModelDefinitionDraft(d.getName(), List.of(), List.of());
                        });

        var export =
                new ModelDefinitionExport(
                        3, List.of(), List.of(exportItem("aeldari_fire_dragon", "Shining Spear")));

        var drafts = service.importModelDefinitions(currentUser(), export);

        assertThat(drafts).singleElement().satisfies(d -> assertThat(d.getName()).isEqualTo("Shining Spear"));
        assertThat(draft.getName()).isEqualTo("Shining Spear");
    }

    @Test
    void importSkipsDefinitionsAlreadyMatchingAnOpenDraft() {
        var draftId = UUID.randomUUID();
        var draft =
                ModelDefinitionDraftEntity.builder()
                        .id(draftId)
                        .externalId("aeldari_fire_dragon")
                        .name("Fire Dragon")
                        .build();

        when(modelDefinitionRepository.findAll()).thenReturn(List.of());
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of(draft));

        var export =
                new ModelDefinitionExport(
                        3, List.of(), List.of(exportItem("aeldari_fire_dragon", "Fire Dragon")));

        assertThat(service.importModelDefinitions(currentUser(), export)).isEmpty();
        verify(modelDefinitionDraftRepository, never()).save(any());
    }

    private static ModelDefinitionExportItem exportItem(String sourceId, String name) {
        return new ModelDefinitionExportItem(sourceId, null, name, List.of(), List.of());
    }

    private static CurrentAuthenticatedUser currentUser() {
        return new CurrentAuthenticatedUser(
                UUID.randomUUID(), "admin@example.com", Role.ADMIN, Instant.now(), null);
    }
}

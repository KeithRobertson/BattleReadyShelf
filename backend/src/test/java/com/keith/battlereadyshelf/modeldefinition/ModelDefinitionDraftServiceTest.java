package com.keith.battlereadyshelf.modeldefinition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.factiondefinition.FactionEntity;
import com.keith.battlereadyshelf.factiondefinition.FactionRepository;
import com.keith.battlereadyshelf.generated.model.FactionExportItem;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionDraft;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExport;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExportItem;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExportItemAttachmentSlotsInner;
import com.keith.battlereadyshelf.generated.model.ModelDefinitionExportItemWargearOptionsInner;
import com.keith.battlereadyshelf.generated.model.WargearExportItem;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;
import com.keith.battlereadyshelf.user.Role;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class ModelDefinitionDraftServiceTest {
    @Mock private ModelDefinitionRepository modelDefinitionRepository;
    @Mock private AttachmentSlotRepository attachmentSlotRepository;
    @Mock private WargearOptionRepository wargearOptionRepository;
    @Mock private WargearDefinitionRepository wargearDefinitionRepository;
    @Mock private WargearDefinitionDraftRepository wargearDefinitionDraftRepository;
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
                        wargearDefinitionRepository,
                        wargearDefinitionDraftRepository,
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
                        .wargearDefinition(wargearDefinition("boltgun", "Boltgun"))
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

        assertThat(result.getSchemaVersion()).isEqualTo(4);
        assertThat(result.getFactions()).singleElement().satisfies(
                item -> {
                    assertThat(item.getId()).isEqualTo("death_guard");
                    assertThat(item.getName()).isEqualTo("Death Guard");
                });
        // Wargear is named once in its own catalogue, not repeated on every option that uses it.
        assertThat(result.getWargear()).singleElement().satisfies(
                item -> {
                    assertThat(item.getId()).isEqualTo("boltgun");
                    assertThat(item.getName()).isEqualTo("Boltgun");
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
                                assertThat(exportedOption.getName()).isNull();
                                assertThat(exportedOption.getSlotIds()).containsExactly("left_arm");
                            });
                });
    }

    @Test
    void exportNamesSharedWargearOnceAcrossModels() {
        var firstId = UUID.randomUUID();
        var secondId = UUID.randomUUID();
        var boltgun = wargearDefinition("boltgun", "Boltgun");

        when(factionRepository.findAll()).thenReturn(List.of());
        when(modelDefinitionRepository.findAll())
                .thenReturn(
                        List.of(
                                publishedModel(firstId, "plague_marine", null, "Plague Marine"),
                                publishedModel(secondId, "poxwalker", null, "Poxwalker")));
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(firstId, secondId)))
                .thenReturn(List.of());
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(firstId, secondId)))
                .thenReturn(
                        List.of(publishedOption(firstId, boltgun), publishedOption(secondId, boltgun)));

        var result = service.exportModelDefinitions();

        assertThat(result.getWargear()).singleElement().satisfies(
                item -> assertThat(item.getId()).isEqualTo("boltgun"));
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
        var customWeapon = wargearDefinition(null, "Custom Weapon");
        var option =
                WargearOptionEntity.builder()
                        .id(optionId)
                        .modelDefinitionId(modelId)
                        .wargearDefinition(customWeapon)
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
        // Wargear falls back to the shared definition's id, not the usage row's, so the same
        // hand-authored wargear used by two models exports as one id.
        assertThat(exported.getWargearOptions().getFirst().getId())
                .isEqualTo(customWeapon.getId().toString());
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
                        .wargearDefinition(wargearDefinition("fusion_gun", "Fusion Gun"))
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
                                                                "fusion_gun", true, List.of("weapon"))
                                                        .name("Fusion Gun")))));

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

    @Test
    void reimportIsUnaffectedByInconsistentWargearNamesAcrossModels() {
        // The same dataset wargear id is spelled differently by different models in the source
        // data. The name lives on the shared definition, so this must not look like a change.
        var factionId = UUID.randomUUID();
        var faction =
                FactionEntity.builder().id(factionId).externalId("aeldari").name("Aeldari").build();
        var shurikenPistol = wargearDefinition("shuriken_pistol", "Shuriken Pistol");

        var guardianId = UUID.randomUUID();
        var rangerId = UUID.randomUUID();
        var guardian = publishedModel(guardianId, "aeldari_guardian", factionId, "Guardian");
        var ranger = publishedModel(rangerId, "aeldari_ranger", factionId, "Ranger");
        var guardianOption = publishedOption(guardianId, shurikenPistol);
        var rangerOption = publishedOption(rangerId, shurikenPistol);

        when(factionRepository.findAll()).thenReturn(List.of(faction));
        when(factionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(modelDefinitionRepository.findAll()).thenReturn(List.of(guardian, ranger));
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of());
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(guardianId, rangerId)))
                .thenReturn(List.of());
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(guardianId, rangerId)))
                .thenReturn(List.of(guardianOption, rangerOption));
        when(wargearDefinitionRepository.findAllByExternalIdIn(List.of("shuriken_pistol")))
                .thenReturn(List.of(shurikenPistol));

        var export =
                new ModelDefinitionExport(
                        3,
                        List.of(new FactionExportItem("aeldari", "Aeldari")),
                        List.of(
                                itemWithWargear(
                                        "aeldari_guardian", "aeldari", "Guardian", "Shuriken Pistol"),
                                itemWithWargear(
                                        "aeldari_ranger", "aeldari", "Ranger", "Shuriken pistol")));

        assertThat(service.importModelDefinitions(currentUser(), export)).isEmpty();
        verify(modelDefinitionDraftRepository, never()).save(any());
        // The stored name wins; the import must not flip it to the other spelling.
        assertThat(shurikenPistol.getName()).isEqualTo("Shuriken Pistol");
        verify(wargearDefinitionRepository, never()).save(any());
    }

    @Test
    void importCreatesOneSharedWargearDefinitionForWargearUsedBySeveralModels() {
        when(modelDefinitionRepository.findAll()).thenReturn(List.of());
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of());
        when(wargearDefinitionRepository.findAllByExternalIdIn(List.of("shuriken_pistol")))
                .thenReturn(List.of());
        when(wargearDefinitionRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            WargearDefinitionEntity definition = invocation.getArgument(0);
                            definition.setId(UUID.randomUUID());
                            return definition;
                        });
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
                                                .name("Model")
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

        var export =
                new ModelDefinitionExport(
                        3,
                        List.of(),
                        List.of(
                                itemWithWargear(
                                        "aeldari_guardian", null, "Guardian", "Shuriken Pistol"),
                                itemWithWargear("aeldari_ranger", null, "Ranger", "Shuriken pistol")));

        service.importModelDefinitions(currentUser(), export);

        // One definition row for the id, shared by both models' usage rows.
        verify(wargearDefinitionRepository, times(1)).save(any());
        var savedOptions = ArgumentCaptor.forClass(WargearOptionDraftEntity.class);
        verify(wargearOptionDraftRepository, times(2)).save(savedOptions.capture());
        var definitions =
                savedOptions.getAllValues().stream()
                        .map(WargearOptionDraftEntity::getWargearDefinition)
                        .toList();
        assertThat(definitions).doesNotContainNull().hasSize(2);
        assertThat(definitions.get(0)).isSameAs(definitions.get(1));
        assertThat(definitions.getFirst().getExternalId()).isEqualTo("shuriken_pistol");
    }

    @Test
    void importStagesAWargearRenameForReviewInsteadOfApplyingItInPlace() {
        // One definition backs every model carrying the item, so an unattended rename would fan out
        // across the catalogue and could silently undo a correction an admin made in the app.
        var factionId = UUID.randomUUID();
        var faction =
                FactionEntity.builder().id(factionId).externalId("aeldari").name("Aeldari").build();
        var shurikenPistol = wargearDefinition("shuriken_pistol", "Shuriken pistol");
        var guardianId = UUID.randomUUID();
        var guardian = publishedModel(guardianId, "aeldari_guardian", factionId, "Guardian");

        when(factionRepository.findAll()).thenReturn(List.of(faction));
        when(factionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(modelDefinitionRepository.findAll()).thenReturn(List.of(guardian));
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of());
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(guardianId)))
                .thenReturn(List.of());
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(guardianId)))
                .thenReturn(List.of(publishedOption(guardianId, shurikenPistol)));
        when(wargearDefinitionRepository.findAllByExternalIdIn(List.of("shuriken_pistol")))
                .thenReturn(List.of(shurikenPistol));

        assertThat(service.importModelDefinitions(currentUser(), v4Export("Shuriken Pistol")))
                .isEmpty();

        assertThat(shurikenPistol.getName()).isEqualTo("Shuriken pistol");
        verify(wargearDefinitionRepository, never()).save(any());
        var staged = ArgumentCaptor.forClass(WargearDefinitionDraftEntity.class);
        verify(wargearDefinitionDraftRepository).save(staged.capture());
        assertThat(staged.getValue().getProposedName()).isEqualTo("Shuriken Pistol");
        assertThat(staged.getValue().getWargearDefinition()).isSameAs(shurikenPistol);
    }

    @Test
    void reimportOfAnUnchangedDocumentLeavesNoPendingWargearRename() {
        // A stale pending change from an earlier import must disappear once the names agree again,
        // otherwise an admin is asked to approve a rename that is already in effect.
        var factionId = UUID.randomUUID();
        var faction =
                FactionEntity.builder().id(factionId).externalId("aeldari").name("Aeldari").build();
        var shurikenPistol = wargearDefinition("shuriken_pistol", "Shuriken Pistol");
        var stale =
                WargearDefinitionDraftEntity.builder()
                        .id(UUID.randomUUID())
                        .wargearDefinition(shurikenPistol)
                        .proposedName("Shuriken pistol")
                        .createdAt(Instant.now())
                        .build();
        var guardianId = UUID.randomUUID();
        var guardian = publishedModel(guardianId, "aeldari_guardian", factionId, "Guardian");

        when(factionRepository.findAll()).thenReturn(List.of(faction));
        when(factionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(modelDefinitionRepository.findAll()).thenReturn(List.of(guardian));
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of());
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(guardianId)))
                .thenReturn(List.of());
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(guardianId)))
                .thenReturn(List.of(publishedOption(guardianId, shurikenPistol)));
        when(wargearDefinitionRepository.findAllByExternalIdIn(List.of("shuriken_pistol")))
                .thenReturn(List.of(shurikenPistol));
        when(wargearDefinitionDraftRepository.findAllByDefinitionId(List.of(shurikenPistol.getId())))
                .thenReturn(Map.of(shurikenPistol.getId(), stale));

        assertThat(service.importModelDefinitions(currentUser(), v4Export("Shuriken Pistol")))
                .isEmpty();

        verify(wargearDefinitionDraftRepository).delete(stale);
        verify(wargearDefinitionDraftRepository, never()).save(any());
    }

    @Test
    void importRejectsModelsReferencingWargearMissingFromTheCatalogue() {
        var export =
                new ModelDefinitionExport(
                                4,
                                List.of(),
                                List.of(
                                        itemReferencingWargear(
                                                "aeldari_guardian", null, "Guardian", "shuriken_pistol")))
                        .wargear(List.of(new WargearExportItem("boltgun", "Boltgun")));

        assertThatThrownBy(() -> service.importModelDefinitions(currentUser(), export))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("shuriken_pistol");
    }

    @Test
    void importRejectsSchemaVersionsOlderThanTheSupportedRange() {
        var export = new ModelDefinitionExport(2, List.of(), List.of());

        assertThatThrownBy(() -> service.importModelDefinitions(currentUser(), export))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("schemaVersion");
    }

    /** A schema version 4 document naming one shared wargear item in its own catalogue. */
    private static ModelDefinitionExport v4Export(String wargearName) {
        return new ModelDefinitionExport(
                        4,
                        List.of(new FactionExportItem("aeldari", "Aeldari")),
                        List.of(
                                itemReferencingWargear(
                                        "aeldari_guardian", "aeldari", "Guardian", "shuriken_pistol")))
                .wargear(List.of(new WargearExportItem("shuriken_pistol", wargearName)));
    }

    private static ModelDefinitionEntity publishedModel(
            UUID id, String externalId, UUID factionId, String name) {
        return ModelDefinitionEntity.builder()
                .id(id)
                .externalId(externalId)
                .factionId(factionId)
                .name(name)
                .build();
    }

    private static WargearOptionEntity publishedOption(
            UUID modelDefinitionId, WargearDefinitionEntity definition) {
        return WargearOptionEntity.builder()
                .id(UUID.randomUUID())
                .modelDefinitionId(modelDefinitionId)
                .wargearDefinition(definition)
                .isDefault(true)
                .attachmentSlots(List.of())
                .build();
    }

    /** Builds a schema version 3 style item, where the wargear name is repeated inline. */
    private static ModelDefinitionExportItem itemWithWargear(
            String sourceId, String factionSourceId, String name, String wargearName) {
        return new ModelDefinitionExportItem(
                sourceId,
                factionSourceId,
                name,
                List.of(),
                List.of(
                        new ModelDefinitionExportItemWargearOptionsInner(
                                        "shuriken_pistol", true, List.of())
                                .name(wargearName)));
    }

    /** Builds a schema version 4 style item, which references wargear by id only. */
    private static ModelDefinitionExportItem itemReferencingWargear(
            String sourceId, String factionSourceId, String name, String wargearSourceId) {
        return new ModelDefinitionExportItem(
                sourceId,
                factionSourceId,
                name,
                List.of(),
                List.of(
                        new ModelDefinitionExportItemWargearOptionsInner(
                                wargearSourceId, true, List.of())));
    }

    private static WargearDefinitionEntity wargearDefinition(String externalId, String name) {
        return WargearDefinitionEntity.builder()
                .id(UUID.randomUUID())
                .externalId(externalId)
                .name(name)
                .build();
    }

    private static ModelDefinitionExportItem exportItem(String sourceId, String name) {
        return new ModelDefinitionExportItem(sourceId, null, name, List.of(), List.of());
    }

    private static CurrentAuthenticatedUser currentUser() {
        return new CurrentAuthenticatedUser(
                UUID.randomUUID(), "admin@example.com", Role.ADMIN, Instant.now(), null);
    }
}

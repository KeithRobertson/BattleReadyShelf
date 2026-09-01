package com.keith.battlereadyshelf.modeldefinition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.entry;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.factiondefinition.FactionDefinitionService;
import com.keith.battlereadyshelf.factiondefinition.FactionEntity;
import com.keith.battlereadyshelf.factiondefinition.FactionRepository;
import com.keith.battlereadyshelf.factiondefinition.FactionUpsertOutcome;
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
import java.util.LinkedHashMap;
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
    @Mock private WargearDefinitionService wargearDefinitionService;
    @Mock private FactionRepository factionRepository;
    @Mock private FactionDefinitionService factionDefinitionService;
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
                        wargearDefinitionService,
                        factionRepository,
                        factionDefinitionService,
                        modelDefinitionDraftRepository,
                        attachmentSlotDraftRepository,
                        wargearOptionDraftRepository,
                        modelDefinitionPublishAuditRepository,
                        modelDefinitionMapper,
                        objectMapper);

        // Factions and wargear are imported from their own pages; unless a test says otherwise,
        // this document defines neither and references nothing that needs resolving.
        lenient()
                .when(factionDefinitionService.upsertFactions(any()))
                .thenReturn(FactionUpsertOutcome.empty());
        lenient()
                .when(wargearDefinitionService.upsertWargear(any()))
                .thenReturn(WargearUpsertOutcome.empty());
        lenient().when(wargearDefinitionService.findBySourceIds(any())).thenReturn(new LinkedHashMap<>());
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
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of(model));
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(modelId)))
                .thenReturn(List.of(slot));
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(modelId)))
                .thenReturn(List.of(option));

        var result = service.exportModelDefinitions();

        assertThat(result.getSchemaVersion()).isEqualTo(4);
        // Factions and wargear are exported from their own admin pages, so a model definition
        // document carries only references to them.
        assertThat(result.getFactions()).isNull();
        assertThat(result.getWargear()).isNull();
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
    void exportReferencesSharedWargearByTheSameIdFromEveryModel() {
        var firstId = UUID.randomUUID();
        var secondId = UUID.randomUUID();
        var boltgun = wargearDefinition("boltgun", "Boltgun");

        when(factionRepository.findAll()).thenReturn(List.of());
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull())
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

        assertThat(result.getModelDefinitions())
                .hasSize(2)
                .allSatisfy(
                        item ->
                                assertThat(item.getWargearOptions())
                                        .singleElement()
                                        .satisfies(option -> assertThat(option.getId()).isEqualTo("boltgun")));
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
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of(model));
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
                        List.of(
                                exportItem("aeldari_fire_dragon", "Fire Dragon"),
                                exportItem("warcry_fire_dragon", "Fire Dragon")));

        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of());
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
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of(published));
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of());
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(modelId)))
                .thenReturn(List.of(slot));
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(modelId)))
                .thenReturn(List.of(option));
        when(wargearDefinitionService.upsertWargear(any()))
                .thenReturn(outcomeFor(option.getWargearDefinition()));

        var export =
                new ModelDefinitionExport(
                        3,
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

        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of());
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
                        3, List.of(exportItem("aeldari_fire_dragon", "Shining Spear")));

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

        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of());
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of(draft));

        var export =
                new ModelDefinitionExport(
                        3, List.of(exportItem("aeldari_fire_dragon", "Fire Dragon")));

        assertThat(service.importModelDefinitions(currentUser(), export)).isEmpty();
        verify(modelDefinitionDraftRepository, never()).save(any());
    }

    @Test
    void reimportIsUnaffectedByInconsistentWargearNamesAcrossModels() {
        // The same dataset wargear id is spelled differently by different models in an older
        // combined catalogue. The name lives on the shared definition, so the first spelling seen
        // wins - letting the last model win would make the stored name depend on document order.
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
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of(guardian, ranger));
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of());
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(guardianId, rangerId)))
                .thenReturn(List.of());
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(guardianId, rangerId)))
                .thenReturn(List.of(guardianOption, rangerOption));
        when(wargearDefinitionService.upsertWargear(any())).thenReturn(outcomeFor(shurikenPistol));

        var export =
                new ModelDefinitionExport(
                        3,
                        List.of(
                                itemWithWargear(
                                        "aeldari_guardian", "aeldari", "Guardian", "Shuriken Pistol"),
                                itemWithWargear(
                                        "aeldari_ranger", "aeldari", "Ranger", "Shuriken pistol")));

        assertThat(service.importModelDefinitions(currentUser(), export)).isEmpty();
        verify(modelDefinitionDraftRepository, never()).save(any());

        var names = ArgumentCaptor.forClass(Map.class);
        verify(wargearDefinitionService).upsertWargear(names.capture());
        assertThat(names.getValue()).containsExactly(entry("shuriken_pistol", "Shuriken Pistol"));
    }

    @Test
    void importPointsEveryUsageOfAWargearIdAtOneSharedDefinition() {
        var shurikenPistol = wargearDefinition("shuriken_pistol", "Shuriken Pistol");

        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of());
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of());
        when(wargearDefinitionService.findBySourceIds(List.of("shuriken_pistol")))
                .thenReturn(new LinkedHashMap<>(Map.of("shuriken_pistol", shurikenPistol)));
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
                        4,
                        List.of(
                                itemReferencingWargear(
                                        "aeldari_guardian", null, "Guardian", "shuriken_pistol"),
                                itemReferencingWargear(
                                        "aeldari_ranger", null, "Ranger", "shuriken_pistol")));

        service.importModelDefinitions(currentUser(), export);

        var savedOptions = ArgumentCaptor.forClass(WargearOptionDraftEntity.class);
        verify(wargearOptionDraftRepository, times(2)).save(savedOptions.capture());
        var definitions =
                savedOptions.getAllValues().stream()
                        .map(WargearOptionDraftEntity::getWargearDefinition)
                        .toList();
        assertThat(definitions).doesNotContainNull().hasSize(2);
        assertThat(definitions.get(0)).isSameAs(definitions.get(1));
        assertThat(definitions.getFirst()).isSameAs(shurikenPistol);
    }

    @Test
    void importRejectsModelsReferencingWargearThatHasNotBeenImportedYet() {
        // A models-only document carries no name for the item, so the only alternative to failing
        // is a nameless placeholder definition. Point the admin at the page that owns it instead.
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of());

        var export =
                new ModelDefinitionExport(
                        4,
                        List.of(
                                itemReferencingWargear(
                                        "aeldari_guardian", null, "Guardian", "shuriken_pistol")));

        assertThatThrownBy(() -> service.importModelDefinitions(currentUser(), export))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("shuriken_pistol")
                .hasMessageContaining("Manage Wargear Definitions");
    }

    @Test
    void importRejectsModelsReferencingAFactionThatHasNotBeenImportedYet() {
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of());
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of());
        when(factionRepository.findAll()).thenReturn(List.of());

        var export =
                new ModelDefinitionExport(
                        4,
                        List.of(
                                new ModelDefinitionExportItem(
                                        "aeldari_guardian",
                                        "aeldari",
                                        "Guardian",
                                        List.of(),
                                        List.of())));

        assertThatThrownBy(() -> service.importModelDefinitions(currentUser(), export))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("aeldari")
                .hasMessageContaining("Manage Factions");
    }

    @Test
    void importStillAcceptsAnOlderCombinedCatalogueThatDefinesItsOwnFactionsAndWargear() {
        var factionId = UUID.randomUUID();
        var faction =
                FactionEntity.builder().id(factionId).externalId("aeldari").name("Aeldari").build();
        var shurikenPistol = wargearDefinition("shuriken_pistol", "Shuriken Pistol");
        var guardianId = UUID.randomUUID();
        var guardian = publishedModel(guardianId, "aeldari_guardian", factionId, "Guardian");

        when(factionDefinitionService.upsertFactions(any()))
                .thenReturn(
                        new FactionUpsertOutcome(
                                Map.of("aeldari", faction), List.of(faction), List.of(), 0));
        when(factionRepository.findAll()).thenReturn(List.of(faction));
        when(wargearDefinitionService.upsertWargear(any())).thenReturn(outcomeFor(shurikenPistol));
        when(modelDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of(guardian));
        when(modelDefinitionDraftRepository.findAll()).thenReturn(List.of());
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(List.of(guardianId)))
                .thenReturn(List.of());
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(List.of(guardianId)))
                .thenReturn(List.of(publishedOption(guardianId, shurikenPistol)));

        var export =
                new ModelDefinitionExport(
                                4,
                                List.of(
                                        itemReferencingWargear(
                                                "aeldari_guardian", "aeldari", "Guardian", "shuriken_pistol")))
                        .factions(List.of(new FactionExportItem("aeldari", "Aeldari")))
                        .wargear(List.of(new WargearExportItem("shuriken_pistol", "Shuriken Pistol")));

        assertThat(service.importModelDefinitions(currentUser(), export)).isEmpty();
        verify(modelDefinitionDraftRepository, never()).save(any());
    }

    @Test
    void importRejectsSchemaVersionsOlderThanTheSupportedRange() {
        var export = new ModelDefinitionExport(2, List.of());

        assertThatThrownBy(() -> service.importModelDefinitions(currentUser(), export))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("schemaVersion");
    }

    private static WargearUpsertOutcome outcomeFor(WargearDefinitionEntity definition) {
        var bySourceId = new LinkedHashMap<String, WargearDefinitionEntity>();
        bySourceId.put(definition.getExternalId(), definition);
        return new WargearUpsertOutcome(bySourceId, List.of(), List.of(), 1);
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

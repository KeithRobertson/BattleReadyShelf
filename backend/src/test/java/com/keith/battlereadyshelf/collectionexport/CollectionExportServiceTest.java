package com.keith.battlereadyshelf.collectionexport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.keith.battlereadyshelf.armycollection.ArmyCollectionEntity;
import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.armycollection.ArmyCollectionsService;
import com.keith.battlereadyshelf.armycollection.ModelDefinitionGroupPositionEntity;
import com.keith.battlereadyshelf.armycollection.ModelDefinitionGroupPositionRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelEntity;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelImageEntity;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelImageRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelMagnetizedSlotEntity;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelMagnetizedSlotRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelStatus;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelStatusEventEntity;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelStatusEventRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelWargearSelectionEntity;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelWargearSelectionRepository;
import com.keith.battlereadyshelf.collectionmodel.ImageVariant;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.factiondefinition.FactionEntity;
import com.keith.battlereadyshelf.factiondefinition.FactionRepository;
import com.keith.battlereadyshelf.generated.model.CollectionExportInclude;
import com.keith.battlereadyshelf.generated.model.CollectionExportRequest;
import com.keith.battlereadyshelf.modeldefinition.AttachmentSlotEntity;
import com.keith.battlereadyshelf.modeldefinition.AttachmentSlotRepository;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionEntity;
import com.keith.battlereadyshelf.modeldefinition.WargearDefinitionEntity;
import com.keith.battlereadyshelf.modeldefinition.WargearOptionEntity;
import com.keith.battlereadyshelf.modeldefinition.WargearOptionRepository;
import com.keith.battlereadyshelf.paint.PaintEntity;
import com.keith.battlereadyshelf.paint.PaintRecipeEntity;
import com.keith.battlereadyshelf.paint.PaintRecipePaintEntity;
import com.keith.battlereadyshelf.paint.PaintRecipeRepository;
import com.keith.battlereadyshelf.paint.PaintRecipeScope;
import com.keith.battlereadyshelf.paint.PaintType;
import com.keith.battlereadyshelf.storage.PresignedUrlService;
import com.keith.battlereadyshelf.user.User;
import com.keith.battlereadyshelf.user.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class CollectionExportServiceTest {
    @Mock private ArmyCollectionRepository armyCollectionRepository;
    @Mock private CollectionModelRepository collectionModelRepository;
    @Mock private CollectionModelWargearSelectionRepository collectionModelWargearSelectionRepository;
    @Mock private CollectionModelMagnetizedSlotRepository collectionModelMagnetizedSlotRepository;
    @Mock private CollectionModelStatusEventRepository collectionModelStatusEventRepository;
    @Mock private CollectionModelImageRepository collectionModelImageRepository;
    @Mock private ModelDefinitionGroupPositionRepository modelDefinitionGroupPositionRepository;
    @Mock private AttachmentSlotRepository attachmentSlotRepository;
    @Mock private WargearOptionRepository wargearOptionRepository;
    @Mock private PaintRecipeRepository paintRecipeRepository;
    @Mock private FactionRepository factionRepository;
    @Mock private UserRepository userRepository;
    @Mock private PresignedUrlService presignedUrlService;
    @Mock private ArmyCollectionsService armyCollectionsService;

    private CollectionExportService collectionExportService;

    private final UUID userId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private final UUID collectionAId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private final UUID collectionBId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc");
    private final UUID factionId = UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd");
    private final UUID modelDefId = UUID.fromString("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");
    private final UUID alphaDefId = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private final UUID zebraDefId = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private final UUID miniNamedId = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private final UUID miniUnnamedId = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private final UUID miniZedId = UUID.fromString("55555555-5555-5555-5555-555555555555");
    private final UUID slotId = UUID.fromString("66666666-6666-6666-6666-666666666666");
    private final UUID optionId = UUID.fromString("77777777-7777-7777-7777-777777777777");
    private final UUID imagePreferredId = UUID.fromString("88888888-8888-8888-8888-888888888888");
    private final UUID imageOtherId = UUID.fromString("99999999-9999-9999-9999-999999999999");

    private ArmyCollectionEntity collectionA;
    private ArmyCollectionEntity collectionB;
    private ModelDefinitionEntity plagueMarine;
    private CollectionModelEntity champion;
    private CollectionModelEntity unnamed;
    private CollectionModelEntity zed;

    @BeforeEach
    void setUp() {
        collectionExportService =
                new CollectionExportService(
                        armyCollectionRepository,
                        collectionModelRepository,
                        collectionModelWargearSelectionRepository,
                        collectionModelMagnetizedSlotRepository,
                        collectionModelStatusEventRepository,
                        collectionModelImageRepository,
                        modelDefinitionGroupPositionRepository,
                        attachmentSlotRepository,
                        wargearOptionRepository,
                        paintRecipeRepository,
                        factionRepository,
                        userRepository,
                        presignedUrlService,
                        armyCollectionsService);

        collectionA =
                ArmyCollectionEntity.builder()
                        .id(collectionAId)
                        .userId(userId)
                        .name("Alpha Guard")
                        .description("First collection")
                        .displayOrder(0)
                        .build();
        collectionB =
                ArmyCollectionEntity.builder()
                        .id(collectionBId)
                        .userId(userId)
                        .name("Beta Guard")
                        .description("Second collection")
                        .displayOrder(1)
                        .build();

        plagueMarine =
                ModelDefinitionEntity.builder()
                        .id(modelDefId)
                        .name("Plague Marine")
                        .factionId(factionId)
                        .build();

        champion =
                CollectionModelEntity.builder()
                        .id(miniNamedId)
                        .armyCollectionId(collectionAId)
                        .modelDefinition(plagueMarine)
                        .name("Champion")
                        .description("With banner")
                        .status(CollectionModelStatus.PAINTED)
                        .build();
        unnamed =
                CollectionModelEntity.builder()
                        .id(miniUnnamedId)
                        .armyCollectionId(collectionAId)
                        .modelDefinition(plagueMarine)
                        .name(null)
                        .description(null)
                        .status(CollectionModelStatus.PRIMED)
                        .build();
        zed =
                CollectionModelEntity.builder()
                        .id(miniZedId)
                        .armyCollectionId(collectionAId)
                        .modelDefinition(plagueMarine)
                        .name("zed")
                        .description("Last named")
                        .status(CollectionModelStatus.BOXED)
                        .build();

        stubEmptyBulkLoads();
        lenient()
                .when(userRepository.findById(userId))
                .thenReturn(
                        Optional.of(
                                User.builder()
                                        .id(userId)
                                        .email("keith@example.com")
                                        .displayName("Keith")
                                        .build()));
    }

    @Test
    void export_emptyArmyCollectionIds_throwsBadRequest() {
        var request =
                new CollectionExportRequest(List.of(), new CollectionExportInclude().status(true));

        assertThatThrownBy(() -> collectionExportService.export(userId, request))
                .isInstanceOf(BadRequestException.class);
        verify(armyCollectionsService, never()).requireOwnedArmyCollection(any(), any());
    }

    @Test
    void export_unownedCollection_throwsNotFoundAndFailsWholeCall() {
        when(armyCollectionsService.requireOwnedArmyCollection(userId, collectionAId))
                .thenThrow(new NotFoundException("Army collection not found: " + collectionAId));

        var request =
                new CollectionExportRequest(
                        List.of(collectionAId), new CollectionExportInclude().status(true));

        assertThatThrownBy(() -> collectionExportService.export(userId, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(collectionAId.toString());
    }

    @Test
    void export_collectionModelIdsWithTwoCollections_throwsBadRequest() {
        var request =
                new CollectionExportRequest(
                                List.of(collectionAId, collectionBId), new CollectionExportInclude())
                        .collectionModelIds(List.of(miniNamedId));

        assertThatThrownBy(() -> collectionExportService.export(userId, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("collectionModelIds requires exactly one collection");
    }

    @Test
    void export_emptyCollectionModelIds_throwsBadRequest() {
        var request =
                new CollectionExportRequest(List.of(collectionAId), new CollectionExportInclude())
                        .collectionModelIds(List.of());

        assertThatThrownBy(() -> collectionExportService.export(userId, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("collectionModelIds must not be empty");
    }

    @Test
    void export_collectionModelIdNotInCollection_throwsNotFoundAndDoesNotAssemble() {
        stubOwned(collectionAId, collectionA);
        when(armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId))
                .thenReturn(List.of(collectionA));
        when(collectionModelRepository.findAllByArmyCollectionId(collectionAId))
                .thenReturn(List.of(champion, unnamed));

        var missingId = UUID.fromString("abcdefab-cdef-abcd-efab-cdefabcdefab");
        var request =
                new CollectionExportRequest(List.of(collectionAId), new CollectionExportInclude())
                        .collectionModelIds(List.of(missingId));

        assertThatThrownBy(() -> collectionExportService.export(userId, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Collection model not found: " + missingId);

        verify(collectionModelRepository).findAllByArmyCollectionId(collectionAId);
        verify(collectionModelWargearSelectionRepository, never()).findAllByCollectionModelIdIn(any());
        verify(collectionModelMagnetizedSlotRepository, never()).findAllByCollectionModelIdIn(any());
        verify(collectionModelStatusEventRepository, never()).findAllByCollectionModelIdIn(any());
        verify(collectionModelImageRepository, never()).findAllByCollectionModelIdIn(any());
        verify(paintRecipeRepository, never()).findAllByArmyCollectionId(any());
    }

    @Test
    void export_collectionModelIds_keepsRequestedMiniatureAndDropsEmptyModelType() {
        stubOwned(collectionAId, collectionA);
        when(armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId))
                .thenReturn(List.of(collectionA));

        var zebra =
                ModelDefinitionEntity.builder()
                        .id(zebraDefId)
                        .name("Zebra Marine")
                        .factionId(factionId)
                        .build();
        var zebraMini =
                CollectionModelEntity.builder()
                        .id(miniZedId)
                        .armyCollectionId(collectionAId)
                        .modelDefinition(zebra)
                        .name("Zebra")
                        .status(CollectionModelStatus.BOXED)
                        .build();
        when(collectionModelRepository.findAllByArmyCollectionId(collectionAId))
                .thenReturn(List.of(champion, zebraMini));

        var collectionRecipe =
                recipe(
                        PaintRecipeScope.COLLECTION,
                        collectionAId,
                        null,
                        null,
                        "Collection notes",
                        "Death Guard Green");
        var keptTypeRecipe =
                recipe(
                        PaintRecipeScope.MODEL_TYPE,
                        collectionAId,
                        modelDefId,
                        null,
                        "Type notes",
                        "Leadbelcher");
        var droppedTypeRecipe =
                recipe(
                        PaintRecipeScope.MODEL_TYPE,
                        collectionAId,
                        zebraDefId,
                        null,
                        "Dropped type notes",
                        "Abaddon Black");
        when(paintRecipeRepository.findAllByArmyCollectionId(collectionAId))
                .thenReturn(List.of(collectionRecipe, keptTypeRecipe, droppedTypeRecipe));

        var result =
                collectionExportService.export(
                        userId,
                        new CollectionExportRequest(
                                        List.of(collectionAId),
                                        new CollectionExportInclude()
                                                .status(true)
                                                .paintRecipes(true)
                                                .miniatureDetails(true))
                                .collectionModelIds(List.of(miniNamedId)));

        var collection = result.getCollections().getFirst();
        assertThat(collection.getModelCount()).isEqualTo(1);
        assertThat(collection.getStatusCounts()).containsEntry("PAINTED", 1).hasSize(1);
        assertThat(collection.getPaintRecipe().getNotes()).isEqualTo("Collection notes");
        assertThat(collection.getModelTypes()).extracting("name").containsExactly("Plague Marine");
        assertThat(collection.getModelTypes().getFirst().getModelCount()).isEqualTo(1);
        assertThat(collection.getModelTypes().getFirst().getStatusCounts())
                .containsEntry("PAINTED", 1)
                .hasSize(1);
        assertThat(collection.getModelTypes().getFirst().getPaintRecipe().getNotes())
                .isEqualTo("Type notes");
        assertThat(collection.getModelTypes().getFirst().getMiniatures())
                .extracting(m -> m.getName())
                .containsExactly("Champion");
    }

    @Test
    void export_duplicateCollectionModelIds_exportsMiniatureOnce() {
        stubBasicCollectionWithThreeMiniatures();

        var result =
                collectionExportService.export(
                        userId,
                        new CollectionExportRequest(
                                        List.of(collectionAId),
                                        new CollectionExportInclude().miniatureDetails(true))
                                .collectionModelIds(List.of(miniNamedId, miniNamedId)));

        var collection = result.getCollections().getFirst();
        assertThat(collection.getModelCount()).isEqualTo(1);
        assertThat(collection.getModelTypes()).extracting("name").containsExactly("Plague Marine");
        assertThat(collection.getModelTypes().getFirst().getMiniatures())
                .extracting(m -> m.getName())
                .containsExactly("Champion");
    }

    @Test
    void export_collections_followDisplayOrderNotRequestOrder() {
        stubOwned(collectionAId, collectionA);
        stubOwned(collectionBId, collectionB);
        when(armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId))
                .thenReturn(List.of(collectionA, collectionB));
        when(collectionModelRepository.findAllByArmyCollectionId(collectionAId)).thenReturn(List.of());
        when(collectionModelRepository.findAllByArmyCollectionId(collectionBId)).thenReturn(List.of());
        when(paintRecipeRepository.findAllByArmyCollectionId(collectionAId)).thenReturn(List.of());
        when(paintRecipeRepository.findAllByArmyCollectionId(collectionBId)).thenReturn(List.of());
        when(modelDefinitionGroupPositionRepository.findByArmyCollectionIdOrderByDisplayOrderAsc(
                        any()))
                .thenReturn(List.of());

        var result =
                collectionExportService.export(
                        userId,
                        new CollectionExportRequest(
                                List.of(collectionBId, collectionAId),
                                new CollectionExportInclude()));

        assertThat(result.getCollections()).extracting("name").containsExactly("Alpha Guard", "Beta Guard");
    }

    @Test
    void export_modelTypes_followGroupOrderThenAlphabetical() {
        stubOwned(collectionAId, collectionA);
        when(armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId))
                .thenReturn(List.of(collectionA));

        var zebra =
                ModelDefinitionEntity.builder().id(zebraDefId).name("Zebra Marine").factionId(factionId).build();
        var alpha =
                ModelDefinitionEntity.builder().id(alphaDefId).name("Alpha Marine").factionId(factionId).build();
        var ordered =
                ModelDefinitionEntity.builder().id(modelDefId).name("Plague Marine").factionId(factionId).build();

        when(collectionModelRepository.findAllByArmyCollectionId(collectionAId))
                .thenReturn(
                        List.of(
                                CollectionModelEntity.builder()
                                        .id(UUID.randomUUID())
                                        .armyCollectionId(collectionAId)
                                        .modelDefinition(zebra)
                                        .status(CollectionModelStatus.BOXED)
                                        .build(),
                                CollectionModelEntity.builder()
                                        .id(UUID.randomUUID())
                                        .armyCollectionId(collectionAId)
                                        .modelDefinition(alpha)
                                        .status(CollectionModelStatus.BOXED)
                                        .build(),
                                CollectionModelEntity.builder()
                                        .id(UUID.randomUUID())
                                        .armyCollectionId(collectionAId)
                                        .modelDefinition(ordered)
                                        .status(CollectionModelStatus.BOXED)
                                        .build()));
        when(modelDefinitionGroupPositionRepository.findByArmyCollectionIdOrderByDisplayOrderAsc(
                        collectionAId))
                .thenReturn(
                        List.of(
                                ModelDefinitionGroupPositionEntity.builder()
                                        .id(UUID.randomUUID())
                                        .armyCollectionId(collectionAId)
                                        .modelDefinitionId(modelDefId)
                                        .displayOrder(0)
                                        .build()));
        when(factionRepository.findAllById(any()))
                .thenReturn(List.of(FactionEntity.builder().id(factionId).name("Death Guard").build()));
        when(paintRecipeRepository.findAllByArmyCollectionId(collectionAId)).thenReturn(List.of());

        var result =
                collectionExportService.export(
                        userId,
                        new CollectionExportRequest(
                                List.of(collectionAId), new CollectionExportInclude().faction(true)));

        assertThat(result.getCollections().getFirst().getModelTypes())
                .extracting("name")
                .containsExactly("Plague Marine", "Alpha Marine", "Zebra Marine");
    }

    @Test
    void export_miniatures_orderedByNameCaseInsensitiveUnnamedLastIdTieBreak() {
        stubBasicCollectionWithThreeMiniatures();

        var result =
                collectionExportService.export(
                        userId,
                        new CollectionExportRequest(
                                List.of(collectionAId),
                                new CollectionExportInclude().miniatureDetails(true)));

        assertThat(result.getCollections().getFirst().getModelTypes().getFirst().getMiniatures())
                .extracting(m -> m.getName())
                .containsExactly("Champion", "zed", null);
    }

    @Test
    void export_includeFlags_gateFieldsAndEchoNormalisedIncluded() {
        stubBasicCollectionWithThreeMiniatures();
        stubLinkedLoadoutOnChampion();
        stubCollectionPaintRecipe();
        stubImagesOnChampion();

        var include =
                new CollectionExportInclude()
                        .collectionDescription(true)
                        .faction(true)
                        .status(false)
                        .statusHistory(true)
                        .wargear(false)
                        .spareBits(true)
                        .paintRecipes(true)
                        .miniatureDetails(true)
                        .thumbnails(false);

        var result =
                collectionExportService.export(
                        userId, new CollectionExportRequest(List.of(collectionAId), include));

        assertThat(result.getIncluded().getCollectionDescription()).isTrue();
        assertThat(result.getIncluded().getFaction()).isTrue();
        assertThat(result.getIncluded().getStatus()).isFalse();
        assertThat(result.getIncluded().getStatusHistory()).isFalse();
        assertThat(result.getIncluded().getWargear()).isFalse();
        assertThat(result.getIncluded().getSpareBits()).isFalse();
        assertThat(result.getIncluded().getPaintRecipes()).isTrue();
        assertThat(result.getIncluded().getMiniatureDetails()).isTrue();
        assertThat(result.getIncluded().getThumbnails()).isFalse();

        var collection = result.getCollections().getFirst();
        assertThat(collection.getDescription()).isEqualTo("First collection");
        assertThat(collection.getStatusCounts()).isNullOrEmpty();
        assertThat(collection.getPaintRecipe()).isNotNull();
        assertThat(collection.getPaintRecipe().getNotes()).isEqualTo("Collection notes");

        var modelType = collection.getModelTypes().getFirst();
        assertThat(modelType.getFaction()).isEqualTo("Death Guard");
        assertThat(modelType.getStatusCounts()).isNullOrEmpty();

        var miniature =
                modelType.getMiniatures().stream()
                        .filter(m -> "Champion".equals(m.getName()))
                        .findFirst()
                        .orElseThrow();
        assertThat(miniature.getName()).isEqualTo("Champion");
        assertThat(miniature.getDescription()).isEqualTo("With banner");
        assertThat(miniature.getStatus()).isNull();
        assertThat(miniature.getStatusChangedAt()).isNull();
        assertThat(miniature.getStatusHistory()).isNullOrEmpty();
        assertThat(miniature.getLoadout()).isNullOrEmpty();
        assertThat(miniature.getThumbnailUrl()).isNull();
    }

    @Test
    void export_includeFlagsOn_populateGatedFields() {
        stubBasicCollectionWithThreeMiniatures();
        stubLinkedLoadoutOnChampion();
        stubStatusHistoryOnChampion();
        stubImagesOnChampion();

        when(presignedUrlService.presignDownload("thumb/preferred"))
                .thenReturn(URI.create("https://r2.example/preferred"));

        var include =
                new CollectionExportInclude()
                        .collectionDescription(true)
                        .faction(true)
                        .status(true)
                        .statusHistory(true)
                        .wargear(true)
                        .spareBits(true)
                        .paintRecipes(false)
                        .miniatureDetails(true)
                        .thumbnails(true);

        var result =
                collectionExportService.export(
                        userId, new CollectionExportRequest(List.of(collectionAId), include));

        assertThat(result.getIncluded().getSpareBits()).isTrue();
        assertThat(result.getIncluded().getStatusHistory()).isTrue();

        var collection = result.getCollections().getFirst();
        assertThat(collection.getStatusCounts())
                .containsEntry("PAINTED", 1)
                .containsEntry("PRIMED", 1)
                .containsEntry("BOXED", 1);

        var miniature =
                collection.getModelTypes().getFirst().getMiniatures().stream()
                        .filter(m -> "Champion".equals(m.getName()))
                        .findFirst()
                        .orElseThrow();
        assertThat(miniature.getStatus()).isEqualTo("PAINTED");
        assertThat(miniature.getStatusChangedAt()).isNotNull();
        assertThat(miniature.getStatusHistory()).isNotEmpty();
        assertThat(miniature.getLoadout()).isNotEmpty();
        assertThat(miniature.getLoadout().getFirst().getWargear()).isEqualTo("Plague spewer");
        assertThat(miniature.getThumbnailUrl()).isEqualTo(URI.create("https://r2.example/preferred"));
        assertThat(miniature.getPaintRecipe()).isNull();
    }

    @Test
    void export_paintRecipes_landOnCollectionModelTypeAndMiniatureScopes() {
        stubBasicCollectionWithThreeMiniatures();

        var collectionRecipe =
                recipe(
                        PaintRecipeScope.COLLECTION,
                        collectionAId,
                        null,
                        null,
                        "Collection notes",
                        "Death Guard Green");
        var typeRecipe =
                recipe(
                        PaintRecipeScope.MODEL_TYPE,
                        collectionAId,
                        modelDefId,
                        null,
                        "Type notes",
                        "Leadbelcher");
        var modelRecipe =
                recipe(
                        PaintRecipeScope.MODEL,
                        collectionAId,
                        null,
                        miniNamedId,
                        "Model notes",
                        "Abaddon Black");

        when(paintRecipeRepository.findAllByArmyCollectionId(collectionAId))
                .thenReturn(List.of(collectionRecipe, typeRecipe, modelRecipe));

        var result =
                collectionExportService.export(
                        userId,
                        new CollectionExportRequest(
                                List.of(collectionAId),
                                new CollectionExportInclude()
                                        .paintRecipes(true)
                                        .miniatureDetails(true)));

        var collection = result.getCollections().getFirst();
        assertThat(collection.getPaintRecipe().getNotes()).isEqualTo("Collection notes");
        assertThat(collection.getPaintRecipe().getPaints().getFirst().getName())
                .isEqualTo("Death Guard Green");

        var modelType = collection.getModelTypes().getFirst();
        assertThat(modelType.getPaintRecipe().getNotes()).isEqualTo("Type notes");
        assertThat(modelType.getPaintRecipe().getPaints().getFirst().getName()).isEqualTo("Leadbelcher");

        var championMini =
                modelType.getMiniatures().stream()
                        .filter(m -> "Champion".equals(m.getName()))
                        .findFirst()
                        .orElseThrow();
        assertThat(championMini.getPaintRecipe().getNotes()).isEqualTo("Model notes");
        assertThat(championMini.getPaintRecipe().getPaints().getFirst().getName())
                .isEqualTo("Abaddon Black");
        assertThat(championMini.getPaintRecipe().getPaints().getFirst().getStep()).isEqualTo("Base");
        assertThat(
                        modelType.getMiniatures().stream()
                                .filter(m -> m.getName() == null)
                                .findFirst()
                                .orElseThrow()
                                .getPaintRecipe())
                .isNull();
    }

    @Test
    void export_thumbnailUrl_onlyWhenRequested_picksListThumbnailViaPresignDownload() {
        stubBasicCollectionWithThreeMiniatures();
        stubImagesOnChampion();

        when(presignedUrlService.presignDownload("thumb/preferred"))
                .thenReturn(URI.create("https://r2.example/preferred"));

        var without =
                collectionExportService.export(
                        userId,
                        new CollectionExportRequest(
                                List.of(collectionAId),
                                new CollectionExportInclude().miniatureDetails(true).thumbnails(false)));
        assertThat(
                        without.getCollections().getFirst().getModelTypes().getFirst().getMiniatures()
                                .stream()
                                .filter(m -> "Champion".equals(m.getName()))
                                .findFirst()
                                .orElseThrow()
                                .getThumbnailUrl())
                .isNull();
        verify(presignedUrlService, never()).presignDownload(any());

        var with =
                collectionExportService.export(
                        userId,
                        new CollectionExportRequest(
                                List.of(collectionAId),
                                new CollectionExportInclude().miniatureDetails(true).thumbnails(true)));
        assertThat(
                        with.getCollections().getFirst().getModelTypes().getFirst().getMiniatures()
                                .stream()
                                .filter(m -> "Champion".equals(m.getName()))
                                .findFirst()
                                .orElseThrow()
                                .getThumbnailUrl())
                .isEqualTo(URI.create("https://r2.example/preferred"));
        verify(presignedUrlService).presignDownload("thumb/preferred");
    }

    @Test
    void export_json_omitsCollectionModelAndDefinitionIdFields() throws Exception {
        // UUIDs inside thumbnailUrl strings (R2 key path segments) are allowed; this test
        // only asserts that collection / model / definition id fields are absent from the DTO.
        stubBasicCollectionWithThreeMiniatures();
        stubLinkedLoadoutOnChampion();
        stubCollectionPaintRecipe();
        stubStatusHistoryOnChampion();
        stubImagesOnChampion();
        var r2UrlWithUuidSegments =
                "https://r2.example/dev/users/"
                        + userId
                        + "/models/"
                        + miniNamedId
                        + "/"
                        + imagePreferredId
                        + ".jpg";
        when(presignedUrlService.presignDownload("thumb/preferred"))
                .thenReturn(URI.create(r2UrlWithUuidSegments));

        var result =
                collectionExportService.export(
                        userId,
                        new CollectionExportRequest(
                                List.of(collectionAId),
                                new CollectionExportInclude()
                                        .collectionDescription(true)
                                        .faction(true)
                                        .status(true)
                                        .statusHistory(true)
                                        .wargear(true)
                                        .spareBits(true)
                                        .paintRecipes(true)
                                        .miniatureDetails(true)
                                        .thumbnails(true)));

        var mapper = new ObjectMapper();
        mapper.registerModule(
                new SimpleModule()
                        .addSerializer(
                                OffsetDateTime.class,
                                new JsonSerializer<>() {
                                    @Override
                                    public void serialize(
                                            OffsetDateTime value,
                                            JsonGenerator gen,
                                            SerializerProvider serializers)
                                            throws IOException {
                                        gen.writeString(value.toString());
                                    }
                                }));
        var tree = mapper.valueToTree(result);
        assertNoIdFields(tree);
        assertThat(tree.toString()).contains(r2UrlWithUuidSegments);
        assertThat(result.getSchemaVersion()).isEqualTo(CollectionExportSchema.CURRENT_VERSION);
        assertThat(result.getOwnerDisplayName()).isEqualTo("Keith");
        assertThat(result.getExportedAt()).isNotNull();
    }

    /**
     * Walks the serialised export document and fails if any object has an {@code id} property.
     * UUID substrings inside {@code thumbnailUrl} values are intentionally permitted.
     */
    private static void assertNoIdFields(JsonNode node) {
        if (node == null || node.isNull()) {
            return;
        }
        if (node.isObject()) {
            assertThat(node.has("id"))
                    .as("export JSON must not include id fields: %s", node)
                    .isFalse();
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                assertNoIdFields(fields.next().getValue());
            }
            return;
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                assertNoIdFields(child);
            }
        }
    }

    private void stubOwned(UUID collectionId, ArmyCollectionEntity entity) {
        when(armyCollectionsService.requireOwnedArmyCollection(userId, collectionId)).thenReturn(entity);
    }

    private void stubEmptyBulkLoads() {
        lenient()
                .when(collectionModelWargearSelectionRepository.findAllByCollectionModelIdIn(anyList()))
                .thenReturn(List.of());
        lenient()
                .when(collectionModelMagnetizedSlotRepository.findAllByCollectionModelIdIn(any()))
                .thenReturn(List.of());
        lenient()
                .when(collectionModelStatusEventRepository.findAllByCollectionModelIdIn(anyList()))
                .thenReturn(List.of());
        lenient()
                .when(collectionModelImageRepository.findAllByCollectionModelIdIn(anyList()))
                .thenReturn(List.of());
        lenient()
                .when(attachmentSlotRepository.findAllByModelDefinitionIdIn(anyList()))
                .thenReturn(List.of());
        lenient()
                .when(wargearOptionRepository.findAllByModelDefinitionIdIn(anyList()))
                .thenReturn(List.of());
        lenient().when(factionRepository.findAllById(any())).thenReturn(List.of());
        lenient()
                .when(modelDefinitionGroupPositionRepository.findByArmyCollectionIdOrderByDisplayOrderAsc(
                                any()))
                .thenReturn(List.of());
        lenient().when(paintRecipeRepository.findAllByArmyCollectionId(any())).thenReturn(List.of());
    }

    private void stubBasicCollectionWithThreeMiniatures() {
        stubOwned(collectionAId, collectionA);
        when(armyCollectionRepository.findAllByUserIdOrderByDisplayOrderAsc(userId))
                .thenReturn(List.of(collectionA));
        when(collectionModelRepository.findAllByArmyCollectionId(collectionAId))
                .thenReturn(List.of(zed, champion, unnamed));
        when(modelDefinitionGroupPositionRepository.findByArmyCollectionIdOrderByDisplayOrderAsc(
                        collectionAId))
                .thenReturn(List.of());
        when(factionRepository.findAllById(any()))
                .thenReturn(List.of(FactionEntity.builder().id(factionId).name("Death Guard").build()));
        when(paintRecipeRepository.findAllByArmyCollectionId(collectionAId)).thenReturn(List.of());
    }

    private void stubLinkedLoadoutOnChampion() {
        when(attachmentSlotRepository.findAllByModelDefinitionIdIn(anyList()))
                .thenReturn(
                        List.of(
                                AttachmentSlotEntity.builder()
                                        .id(slotId)
                                        .modelDefinitionId(modelDefId)
                                        .name("Right hand")
                                        .type("HAND")
                                        .build()));
        when(wargearOptionRepository.findAllByModelDefinitionIdIn(anyList()))
                .thenReturn(
                        List.of(
                                WargearOptionEntity.builder()
                                        .id(optionId)
                                        .modelDefinitionId(modelDefId)
                                        .wargearDefinition(
                                                WargearDefinitionEntity.builder()
                                                        .id(UUID.randomUUID())
                                                        .name("Plague spewer")
                                                        .build())
                                        .build()));
        when(collectionModelWargearSelectionRepository.findAllByCollectionModelIdIn(anyList()))
                .thenReturn(
                        List.of(
                                CollectionModelWargearSelectionEntity.builder()
                                        .id(UUID.randomUUID())
                                        .collectionModelId(miniNamedId)
                                        .attachmentSlotId(slotId)
                                        .wargearOptionId(optionId)
                                        .equipped(true)
                                        .build()));
    }

    private void stubStatusHistoryOnChampion() {
        var older = Instant.parse("2026-09-01T10:00:00Z");
        var newer = Instant.parse("2026-10-02T18:30:00Z");
        when(collectionModelStatusEventRepository.findAllByCollectionModelIdIn(anyList()))
                .thenReturn(
                        List.of(
                                CollectionModelStatusEventEntity.builder()
                                        .id(UUID.randomUUID())
                                        .collectionModelId(miniNamedId)
                                        .status(CollectionModelStatus.PRIMED)
                                        .changedAt(older)
                                        .build(),
                                CollectionModelStatusEventEntity.builder()
                                        .id(UUID.randomUUID())
                                        .collectionModelId(miniNamedId)
                                        .status(CollectionModelStatus.PAINTED)
                                        .changedAt(newer)
                                        .build()));
    }

    private void stubImagesOnChampion() {
        when(collectionModelImageRepository.findAllByCollectionModelIdIn(anyList()))
                .thenReturn(
                        List.of(
                                CollectionModelImageEntity.builder()
                                        .id(imageOtherId)
                                        .collectionModelId(miniNamedId)
                                        .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                                        .listThumbnail(false)
                                        .thumbnail(
                                                ImageVariant.builder()
                                                        .storageKey("thumb/other")
                                                        .build())
                                        .build(),
                                CollectionModelImageEntity.builder()
                                        .id(imagePreferredId)
                                        .collectionModelId(miniNamedId)
                                        .createdAt(Instant.parse("2026-02-01T00:00:00Z"))
                                        .listThumbnail(true)
                                        .thumbnail(
                                                ImageVariant.builder()
                                                        .storageKey("thumb/preferred")
                                                        .build())
                                        .build()));
    }

    private void stubCollectionPaintRecipe() {
        when(paintRecipeRepository.findAllByArmyCollectionId(collectionAId))
                .thenReturn(
                        List.of(
                                recipe(
                                        PaintRecipeScope.COLLECTION,
                                        collectionAId,
                                        null,
                                        null,
                                        "Collection notes",
                                        "Death Guard Green")));
    }

    private static PaintRecipeEntity recipe(
            PaintRecipeScope scope,
            UUID armyCollectionId,
            UUID modelDefinitionId,
            UUID collectionModelId,
            String notes,
            String paintName) {
        var paint =
                PaintEntity.builder()
                        .id(UUID.randomUUID())
                        .name(paintName)
                        .brand("Citadel")
                        .paintType(PaintType.BASE)
                        .hexColour("#848A66")
                        .build();
        var entry =
                PaintRecipePaintEntity.builder()
                        .id(UUID.randomUUID())
                        .paint(paint)
                        .position(0)
                        .stepLabel("Base")
                        .note("thinned")
                        .showOnCard(true)
                        .build();
        var recipe =
                PaintRecipeEntity.builder()
                        .id(UUID.randomUUID())
                        .scope(scope)
                        .armyCollectionId(armyCollectionId)
                        .modelDefinitionId(modelDefinitionId)
                        .collectionModelId(collectionModelId)
                        .notes(notes)
                        .updatedAt(Instant.parse("2026-11-01T00:00:00Z"))
                        .build();
        recipe.replacePaints(List.of(entry));
        return recipe;
    }
}

package com.keith.battlereadyshelf.paint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.armycollection.ArmyCollectionEntity;
import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelEntity;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.PaintRecipeEntry;
import com.keith.battlereadyshelf.generated.model.PaintRecipeScope;
import com.keith.battlereadyshelf.generated.model.SavePaintRecipeRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class PaintRecipeServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID OTHER_USER_ID = UUID.randomUUID();
    private static final UUID COLLECTION_ID = UUID.randomUUID();

    @Mock private PaintRecipeRepository paintRecipeRepository;
    @Mock private PaintRepository paintRepository;
    @Mock private ArmyCollectionRepository armyCollectionRepository;
    @Mock private CollectionModelRepository collectionModelRepository;

    private PaintRecipeService service;

    @BeforeEach
    void setUp() {
        service =
                new PaintRecipeService(
                        paintRecipeRepository,
                        paintRepository,
                        armyCollectionRepository,
                        collectionModelRepository);

        lenient()
                .when(paintRecipeRepository.saveAndFlush(any()))
                .thenAnswer(
                        invocation -> {
                            PaintRecipeEntity entity = invocation.getArgument(0);
                            if (entity.getId() == null) {
                                entity.setId(UUID.randomUUID());
                            }
                            // Deliberately leaves updatedAt unset. Hibernate only populates it when
                            // the insert is executed, so a mock that filled it in would hide the
                            // service reading a timestamp that is not there yet.
                            return entity;
                        });
    }

    private void collectionOwnedBy(UUID userId) {
        when(armyCollectionRepository.findById(COLLECTION_ID))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(COLLECTION_ID)
                                        .userId(userId)
                                        .name("Death Guard")
                                        .isPublic(false)
                                        .build()));
    }

    private PaintEntity paint(String name) {
        return PaintEntity.builder().id(UUID.randomUUID()).name(name).brand("Citadel").build();
    }

    private SavePaintRecipeRequest collectionScoped(List<PaintRecipeEntry> entries) {
        return new SavePaintRecipeRequest(PaintRecipeScope.COLLECTION, COLLECTION_ID, entries);
    }

    @Test
    void aCollectionWideRecipeRecordsTheSharedBaseCoatOnce() {
        var fenrisian = paint("Fenrisian Grey");
        collectionOwnedBy(USER_ID);
        when(paintRecipeRepository.findByArmyCollectionIdAndScope(
                        COLLECTION_ID, com.keith.battlereadyshelf.paint.PaintRecipeScope.COLLECTION))
                .thenReturn(Optional.empty());
        when(paintRepository.findAllById(List.of(fenrisian.getId()))).thenReturn(List.of(fenrisian));

        var saved =
                service.savePaintRecipe(
                        USER_ID,
                        collectionScoped(
                                        List.of(
                                                new PaintRecipeEntry(fenrisian.getId())
                                                        .stepLabel("Base")))
                                .notes("Everything here is based Fenrisian Grey."));

        assertThat(saved.getScope()).isEqualTo(PaintRecipeScope.COLLECTION);
        assertThat(saved.getModelDefinitionId()).isNull();
        assertThat(saved.getCollectionModelId()).isNull();
        assertThat(saved.getPaints()).singleElement().satisfies(entry -> {
            assertThat(entry.getStepLabel()).isEqualTo("Base");
            // The paint travels with the recipe so a viewer who cannot fetch the owner's personal
            // paints can still read it.
            assertThat(entry.getPaint().getName()).isEqualTo("Fenrisian Grey");
        });
    }

    @Test
    void positionsComeFromTheOrderSentSoAReorderIsJustAnotherSave() {
        var first = paint("Leadbelcher");
        var second = paint("Nuln Oil");
        collectionOwnedBy(USER_ID);
        when(paintRecipeRepository.findByArmyCollectionIdAndScope(
                        COLLECTION_ID, com.keith.battlereadyshelf.paint.PaintRecipeScope.COLLECTION))
                .thenReturn(Optional.empty());
        when(paintRepository.findAllById(List.of(second.getId(), first.getId())))
                .thenReturn(List.of(first, second));

        service.savePaintRecipe(
                USER_ID,
                collectionScoped(
                        List.of(
                                new PaintRecipeEntry(second.getId()),
                                new PaintRecipeEntry(first.getId()))));

        var captured = captureSaved();
        assertThat(captured.getPaints())
                .extracting(PaintRecipePaintEntity::getPosition)
                .containsExactly(0, 1);
        assertThat(captured.getPaints().getFirst().getPaint().getName()).isEqualTo("Nuln Oil");
    }

    @Test
    void onlyTheFirstFewStepsShowOnACardUnlessTheOwnerSaysOtherwise() {
        // A card has room for a few swatches, so a long recipe must not fill it. The first steps
        // stand in for the model when the client has expressed no preference.
        var paints = List.of(paint("A"), paint("B"), paint("C"), paint("D"));
        var ids = paints.stream().map(PaintEntity::getId).toList();
        collectionOwnedBy(USER_ID);
        when(paintRecipeRepository.findByArmyCollectionIdAndScope(
                        COLLECTION_ID, com.keith.battlereadyshelf.paint.PaintRecipeScope.COLLECTION))
                .thenReturn(Optional.empty());
        when(paintRepository.findAllById(ids)).thenReturn(paints);

        service.savePaintRecipe(
                USER_ID, collectionScoped(ids.stream().map(PaintRecipeEntry::new).toList()));

        assertThat(captureSaved().getPaints())
                .extracting(PaintRecipePaintEntity::isShowOnCard)
                .containsExactly(true, true, true, false);
    }

    @Test
    void anExplicitCardChoiceIsKeptRegardlessOfPosition() {
        var first = paint("Leadbelcher");
        var second = paint("Nuln Oil");
        collectionOwnedBy(USER_ID);
        when(paintRecipeRepository.findByArmyCollectionIdAndScope(
                        COLLECTION_ID, com.keith.battlereadyshelf.paint.PaintRecipeScope.COLLECTION))
                .thenReturn(Optional.empty());
        when(paintRepository.findAllById(List.of(first.getId(), second.getId())))
                .thenReturn(List.of(first, second));

        service.savePaintRecipe(
                USER_ID,
                collectionScoped(
                        List.of(
                                new PaintRecipeEntry(first.getId()).showOnCard(false),
                                new PaintRecipeEntry(second.getId()).showOnCard(true))));

        assertThat(captureSaved().getPaints())
                .extracting(PaintRecipePaintEntity::isShowOnCard)
                .containsExactly(false, true);
    }

    @Test
    void replacingAnExistingRecipeFreesTheOldPositionsBeforeReusingThem() {
        // Positions are unique per recipe, and Hibernate flushes inserts before deletes, so a save
        // that reuses position 0 would collide with the row still holding it. The old steps have to
        // be flushed away on their own first.
        var paint = paint("Leadbelcher");
        var stored =
                PaintRecipeEntity.builder()
                        .id(UUID.randomUUID())
                        .scope(com.keith.battlereadyshelf.paint.PaintRecipeScope.COLLECTION)
                        .armyCollectionId(COLLECTION_ID)
                        .build();
        stored.replacePaints(
                List.of(PaintRecipePaintEntity.builder().paint(paint).position(0).build()));
        collectionOwnedBy(USER_ID);
        when(paintRecipeRepository.findByArmyCollectionIdAndScope(
                        COLLECTION_ID, com.keith.battlereadyshelf.paint.PaintRecipeScope.COLLECTION))
                .thenReturn(Optional.of(stored));
        when(paintRepository.findAllById(List.of(paint.getId()))).thenReturn(List.of(paint));

        var sizesAtFlush = new ArrayList<Integer>();
        doAnswer(
                        invocation -> {
                            PaintRecipeEntity entity = invocation.getArgument(0);
                            sizesAtFlush.add(entity.getPaints().size());
                            return entity;
                        })
                .when(paintRecipeRepository)
                .saveAndFlush(any());

        service.savePaintRecipe(
                USER_ID, collectionScoped(List.of(new PaintRecipeEntry(paint.getId()))));

        assertThat(sizesAtFlush).containsExactly(0, 1);
    }

    @Test
    void theSamePaintMayAppearTwiceBecauseAMetalIsOftenBothBaseAndHighlight() {
        var leadbelcher = paint("Leadbelcher");
        collectionOwnedBy(USER_ID);
        when(paintRecipeRepository.findByArmyCollectionIdAndScope(
                        COLLECTION_ID, com.keith.battlereadyshelf.paint.PaintRecipeScope.COLLECTION))
                .thenReturn(Optional.empty());
        when(paintRepository.findAllById(List.of(leadbelcher.getId())))
                .thenReturn(List.of(leadbelcher));

        var saved =
                service.savePaintRecipe(
                        USER_ID,
                        collectionScoped(
                                List.of(
                                        new PaintRecipeEntry(leadbelcher.getId()).stepLabel("Base"),
                                        new PaintRecipeEntry(leadbelcher.getId())
                                                .stepLabel("Edge highlight"))));

        assertThat(saved.getPaints()).hasSize(2);
    }

    @Test
    void anEmptyRecipeDeletesRatherThanStoringABlankRow() {
        var existing =
                PaintRecipeEntity.builder()
                        .id(UUID.randomUUID())
                        .scope(com.keith.battlereadyshelf.paint.PaintRecipeScope.COLLECTION)
                        .armyCollectionId(COLLECTION_ID)
                        .build();
        collectionOwnedBy(USER_ID);
        when(paintRecipeRepository.findByArmyCollectionIdAndScope(
                        COLLECTION_ID, com.keith.battlereadyshelf.paint.PaintRecipeScope.COLLECTION))
                .thenReturn(Optional.of(existing));

        var saved = service.savePaintRecipe(USER_ID, collectionScoped(List.of()));

        assertThat(saved).isNull();
        verify(paintRecipeRepository).delete(existing);
        verify(paintRecipeRepository, never()).saveAndFlush(any());
    }

    @Test
    void aRecipeIsStillReturnedWhenTheDatabaseHasNotStampedItYet() {
        // Regression: the timestamp is generated when the insert executes, so reading it straight
        // off a freshly saved entity used to fail the whole save with a NullPointerException.
        var fenrisian = paint("Fenrisian Grey");
        collectionOwnedBy(USER_ID);
        when(paintRecipeRepository.findByArmyCollectionIdAndScope(
                        COLLECTION_ID, com.keith.battlereadyshelf.paint.PaintRecipeScope.COLLECTION))
                .thenReturn(Optional.empty());
        when(paintRepository.findAllById(List.of(fenrisian.getId()))).thenReturn(List.of(fenrisian));

        var saved =
                service.savePaintRecipe(
                        USER_ID, collectionScoped(List.of(new PaintRecipeEntry(fenrisian.getId()))));

        assertThat(saved).isNotNull();
        assertThat(saved.getUpdatedAt()).isNull();
    }

    @Test
    void aModelTypeRecipeMustNameATypeTheCollectionActuallyContains() {
        var modelDefinitionId = UUID.randomUUID();
        collectionOwnedBy(USER_ID);
        when(collectionModelRepository.existsByArmyCollectionIdAndModelDefinitionId(
                        COLLECTION_ID, modelDefinitionId))
                .thenReturn(false);

        var request =
                new SavePaintRecipeRequest(PaintRecipeScope.MODEL_TYPE, COLLECTION_ID, List.of())
                        .modelDefinitionId(modelDefinitionId)
                        .notes("All Poxwalkers");

        assertThatThrownBy(() -> service.savePaintRecipe(USER_ID, request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void aScopeMayNotCarryATargetItDoesNotHave() {
        collectionOwnedBy(USER_ID);

        var request = collectionScoped(List.of()).collectionModelId(UUID.randomUUID());

        assertThatThrownBy(() -> service.savePaintRecipe(USER_ID, request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void aModelScopedRecipeMustBelongToTheCollectionItIsSavedAgainst() {
        var model =
                CollectionModelEntity.builder()
                        .id(UUID.randomUUID())
                        .armyCollectionId(UUID.randomUUID())
                        .build();
        collectionOwnedBy(USER_ID);
        when(collectionModelRepository.findById(model.getId())).thenReturn(Optional.of(model));

        var request =
                new SavePaintRecipeRequest(PaintRecipeScope.MODEL, COLLECTION_ID, List.of())
                        .collectionModelId(model.getId())
                        .notes("Squad leader");

        assertThatThrownBy(() -> service.savePaintRecipe(USER_ID, request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void someoneElsesCollectionIsNotFoundRatherThanForbidden() {
        collectionOwnedBy(OTHER_USER_ID);

        assertThatThrownBy(() -> service.savePaintRecipe(USER_ID, collectionScoped(List.of())))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void aPublicCollectionsRecipesAreReadableByOtherUsersButNotWritable() {
        when(armyCollectionRepository.findById(COLLECTION_ID))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(COLLECTION_ID)
                                        .userId(OTHER_USER_ID)
                                        .name("Someone's Death Guard")
                                        .isPublic(true)
                                        .build()));
        when(paintRecipeRepository.findAllByArmyCollectionId(COLLECTION_ID)).thenReturn(List.of());

        assertThat(service.getPaintRecipes(USER_ID, COLLECTION_ID)).isEmpty();
        assertThatThrownBy(() -> service.savePaintRecipe(USER_ID, collectionScoped(List.of())))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void anUnknownPaintIsRejectedRatherThanSilentlyDropped() {
        var unknownPaintId = UUID.randomUUID();
        collectionOwnedBy(USER_ID);
        when(paintRecipeRepository.findByArmyCollectionIdAndScope(
                        COLLECTION_ID, com.keith.battlereadyshelf.paint.PaintRecipeScope.COLLECTION))
                .thenReturn(Optional.empty());
        when(paintRepository.findAllById(List.of(unknownPaintId))).thenReturn(List.of());

        var request = collectionScoped(List.of(new PaintRecipeEntry(unknownPaintId)));

        assertThatThrownBy(() -> service.savePaintRecipe(USER_ID, request))
                .isInstanceOf(NotFoundException.class);
    }

    private PaintRecipeEntity captureSaved() {
        var captor = org.mockito.ArgumentCaptor.forClass(PaintRecipeEntity.class);
        verify(paintRecipeRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }
}

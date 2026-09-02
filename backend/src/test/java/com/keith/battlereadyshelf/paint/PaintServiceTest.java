package com.keith.battlereadyshelf.paint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.definitiondraft.Definition;
import com.keith.battlereadyshelf.definitiondraft.DefinitionPublishAuditService;
import com.keith.battlereadyshelf.definitiondraft.ProposalOrigin;
import com.keith.battlereadyshelf.definitionexport.ExportSchema;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.ConflictException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.PaintExport;
import com.keith.battlereadyshelf.generated.model.PaintExportItem;
import com.keith.battlereadyshelf.generated.model.UpdatePaintRequest;
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
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class PaintServiceTest {

    private static final CurrentAuthenticatedUser ADMIN =
            new CurrentAuthenticatedUser(
                    UUID.randomUUID(), "admin@example.com", Role.ADMIN, Instant.now(), Instant.now());

    @Mock private PaintRepository paintRepository;
    @Mock private PaintDraftRepository paintDraftRepository;
    @Mock private PaintRecipeRepository paintRecipeRepository;
    @Mock private DefinitionPublishAuditService definitionPublishAuditService;

    private PaintService service;

    @BeforeEach
    void setUp() {
        service =
                new PaintService(
                        paintRepository,
                        paintDraftRepository,
                        paintRecipeRepository,
                        definitionPublishAuditService);

        lenient().when(paintRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient()
                .when(paintDraftRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            PaintDraftEntity draft = invocation.getArgument(0);
                            if (draft.getId() == null) {
                                draft.setId(UUID.randomUUID());
                            }
                            return draft;
                        });
    }

    private PaintEntity catalogueLeadbelcher() {
        return PaintEntity.builder()
                .id(UUID.randomUUID())
                .externalId("leadbelcher")
                .name("Leadbelcher")
                .brand("Citadel")
                .paintType(PaintType.BASE)
                .hexColour("#8b8b8b")
                .build();
    }

    private UpdatePaintRequest asStored(PaintEntity paint) {
        return new UpdatePaintRequest(paint.getName())
                .brand(paint.getBrand())
                .paintType(PaintMapper.toDto(paint.getPaintType()))
                .hexColour(paint.getHexColour());
    }

    @Test
    void aChangeIsStagedRatherThanAppliedBecauseOneRowBacksEveryRecipe() {
        var paint = catalogueLeadbelcher();
        when(paintRepository.findById(paint.getId())).thenReturn(Optional.of(paint));
        when(paintRepository.findClash(null, "Leadbelcher", "Citadel")).thenReturn(Optional.empty());
        when(paintDraftRepository.findByPaintId(paint.getId())).thenReturn(Optional.empty());
        when(paintRecipeRepository.countUsagesOfPaint(paint.getId())).thenReturn(9L);

        var staged = service.proposePaintChange(paint.getId(), asStored(paint).hexColour("#A0A0A0"));

        assertThat(staged).isNotNull();
        assertThat(staged.getCurrentHexColour()).isEqualTo("#8b8b8b");
        assertThat(staged.getProposedHexColour()).isEqualTo("#a0a0a0");
        assertThat(staged.getUsageCount()).isEqualTo(9);
        // The catalogue row is untouched until an admin accepts.
        assertThat(paint.getHexColour()).isEqualTo("#8b8b8b");
        verify(paintRepository, never()).save(any());
    }

    @Test
    void reproposingTheStoredStateStagesNothingAndClearsAnyStaleDraft() {
        var paint = catalogueLeadbelcher();
        var stale =
                PaintDraftEntity.builder()
                        .id(UUID.randomUUID())
                        .paint(paint)
                        .proposedName("Boltgun Metal")
                        .createdAt(Instant.now())
                        .origin(ProposalOrigin.ADMIN)
                        .build();
        when(paintRepository.findById(paint.getId())).thenReturn(Optional.of(paint));
        when(paintRepository.findClash(null, "Leadbelcher", "Citadel")).thenReturn(Optional.empty());
        when(paintDraftRepository.findByPaintId(paint.getId())).thenReturn(Optional.of(stale));

        var staged = service.proposePaintChange(paint.getId(), asStored(paint));

        assertThat(staged).isNull();
        verify(paintDraftRepository).delete(stale);
    }

    @Test
    void aProposalDifferingOnlyByColourCaseIsNotAChange() {
        // Colours are normalised on the way in, so #8B8B8B and #8b8b8b are the same swatch and must
        // not raise a draft that would look like a real edit to a reviewer.
        var paint = catalogueLeadbelcher();
        when(paintRepository.findById(paint.getId())).thenReturn(Optional.of(paint));
        when(paintRepository.findClash(null, "Leadbelcher", "Citadel")).thenReturn(Optional.empty());
        when(paintDraftRepository.findByPaintId(paint.getId())).thenReturn(Optional.empty());

        assertThat(service.proposePaintChange(paint.getId(), asStored(paint).hexColour("#8B8B8B")))
                .isNull();
        verify(paintDraftRepository, never()).save(any());
    }

    @Test
    void publishingAppliesEveryProposedFieldAndRecordsAnAuditEntry() {
        var paint = catalogueLeadbelcher();
        var draft =
                PaintDraftEntity.builder()
                        .id(UUID.randomUUID())
                        .paint(paint)
                        .proposedName("Iron Warriors")
                        .proposedBrand("Citadel")
                        .proposedPaintType(PaintType.LAYER)
                        .proposedHexColour("#5a5a5a")
                        .origin(ProposalOrigin.ADMIN)
                        .createdAt(Instant.now())
                        .build();
        when(paintDraftRepository.findById(draft.getId())).thenReturn(Optional.of(draft));
        when(paintRecipeRepository.countUsagesOfPaint(paint.getId())).thenReturn(3L);

        var published = service.publishPaintDraft(ADMIN, draft.getId());

        assertThat(published.getName()).isEqualTo("Iron Warriors");
        assertThat(published.getPaintType()).isEqualTo(PaintMapper.toDto(PaintType.LAYER));
        assertThat(published.getHexColour()).isEqualTo("#5a5a5a");
        verify(paintDraftRepository).delete(draft);
        verify(definitionPublishAuditService)
                .record(
                        eq(Definition.PAINT),
                        eq(paint.getId()),
                        eq(ADMIN.id()),
                        eq(ProposalOrigin.ADMIN),
                        any(),
                        any());
    }

    @Test
    void aPaintStillNamedByARecipeCannotBeRemovedFromTheCatalogue() {
        var paint = catalogueLeadbelcher();
        when(paintRepository.findById(paint.getId())).thenReturn(Optional.of(paint));
        when(paintRecipeRepository.countUsagesOfPaint(paint.getId())).thenReturn(5L);

        assertThatThrownBy(() -> service.deletePaint(paint.getId()))
                .isInstanceOf(ConflictException.class);
        verify(paintRepository, never()).deleteById(any());
    }

    @Test
    void aPaintSomeoneHasCustomisedCannotBeRemovedFromTheCatalogue() {
        var paint = catalogueLeadbelcher();
        when(paintRepository.findById(paint.getId())).thenReturn(Optional.of(paint));
        when(paintRecipeRepository.countUsagesOfPaint(paint.getId())).thenReturn(0L);
        when(paintRepository.existsByBasePaintId(paint.getId())).thenReturn(true);

        assertThatThrownBy(() -> service.deletePaint(paint.getId()))
                .isInstanceOf(ConflictException.class);
        verify(paintRepository, never()).deleteById(any());
    }

    @Test
    void aPersonalPaintIsInvisibleToTheAdminCatalogueEvenWhenAskedForById() {
        var personal =
                PaintEntity.builder()
                        .id(UUID.randomUUID())
                        .ownerUserId(UUID.randomUUID())
                        .name("Someone's mix")
                        .build();
        when(paintRepository.findById(personal.getId())).thenReturn(Optional.of(personal));

        assertThatThrownBy(() -> service.deletePaint(personal.getId()))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void theCatalogueRefusesASecondPaintWithTheSameBrandAndName() {
        when(paintRepository.findClash(null, "Leadbelcher", "Citadel"))
                .thenReturn(Optional.of(catalogueLeadbelcher()));

        assertThatThrownBy(
                        () ->
                                service.createPaint(
                                        new UpdatePaintRequest("Leadbelcher").brand("Citadel")))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void anExportIsOrderedBySourceIdSoAnUnchangedCatalogueProducesAnIdenticalFile() {
        var handAuthored =
                PaintEntity.builder()
                        .id(UUID.fromString("00000000-0000-4000-8000-000000000001"))
                        .name("House mix")
                        .build();
        when(paintRepository.findAllByOwnerUserIdIsNull())
                .thenReturn(List.of(catalogueLeadbelcher(), handAuthored));

        var export = service.exportPaints();

        assertThat(export.getSchemaVersion()).isEqualTo(ExportSchema.CURRENT_VERSION);
        assertThat(export.getExportedAt()).isNotNull();
        // The hand-authored paint has no dataset id, so it emits its own UUID and still round-trips.
        assertThat(export.getPaints())
                .extracting(PaintExportItem::getId)
                .containsExactly("00000000-0000-4000-8000-000000000001", "leadbelcher");
        assertThat(export.getPaints().getLast().getHexColour()).isEqualTo("#8b8b8b");
    }

    @Test
    void anUnsupportedSchemaVersionIsRejectedRatherThanGuessedAt() {
        assertThatThrownBy(
                        () ->
                                service.importPaints(
                                        new PaintExport(
                                                ExportSchema.MINIMUM_SUPPORTED_VERSION - 1, List.of())))
                .isInstanceOf(BadRequestException.class);
        verify(paintRepository, never()).save(any());
    }

    @Test
    void anImportCreatesPaintsTheCatalogueDoesNotHaveYet() {
        when(paintRepository.findAllByOwnerUserIdIsNullAndExternalIdIn(List.of("leadbelcher")))
                .thenReturn(List.of());
        when(paintRepository.findClash(null, "Leadbelcher", "Citadel")).thenReturn(Optional.empty());

        var result =
                service.importPaints(
                        new PaintExport(
                                ExportSchema.CURRENT_VERSION,
                                List.of(
                                        new PaintExportItem("leadbelcher", "Leadbelcher")
                                                .brand("Citadel")
                                                .hexColour("#8B8B8B"))));

        assertThat(result.getCreated()).hasSize(1);
        assertThat(result.getCreated().getFirst().getName()).isEqualTo("Leadbelcher");
        // Colours are normalised on the way in, so a later export is stable.
        assertThat(result.getCreated().getFirst().getHexColour()).isEqualTo("#8b8b8b");
        assertThat(result.getPendingChanges()).isEmpty();
        assertThat(result.getUnchanged()).isZero();
    }

    @Test
    void aUuidSourceIdIsNotStoredAsIfItCameFromADataset() {
        var id = UUID.randomUUID().toString();
        when(paintRepository.findAllByOwnerUserIdIsNullAndExternalIdIn(List.of(id)))
                .thenReturn(List.of());
        when(paintRepository.findById(UUID.fromString(id))).thenReturn(Optional.empty());
        when(paintRepository.findClash(null, "House mix", null)).thenReturn(Optional.empty());

        service.importPaints(
                new PaintExport(
                        ExportSchema.CURRENT_VERSION, List.of(new PaintExportItem(id, "House mix"))));

        var saved = ArgumentCaptor.forClass(PaintEntity.class);
        verify(paintRepository).save(saved.capture());
        assertThat(saved.getValue().getExternalId()).isNull();
    }

    @Test
    void anImportProposesADifferenceRatherThanEditingWhatUsersAlreadyRecorded() {
        var paint = catalogueLeadbelcher();
        when(paintRepository.findAllByOwnerUserIdIsNullAndExternalIdIn(List.of("leadbelcher")))
                .thenReturn(List.of(paint));
        when(paintDraftRepository.findAllByPaintIdIn(List.of(paint.getId()))).thenReturn(List.of());

        var result =
                service.importPaints(
                        new PaintExport(
                                ExportSchema.CURRENT_VERSION,
                                List.of(
                                        new PaintExportItem("leadbelcher", "Leadbelcher")
                                                .brand("Citadel")
                                                .paintType(PaintMapper.toDto(PaintType.BASE))
                                                .hexColour("#a0a0a0"))));

        assertThat(result.getCreated()).isEmpty();
        assertThat(result.getPendingChanges()).hasSize(1);
        assertThat(result.getPendingChanges().getFirst().getProposedHexColour()).isEqualTo("#a0a0a0");
        assertThat(result.getPendingChanges().getFirst().getOrigin())
                .isEqualTo(DefinitionPublishAuditService.toDto(ProposalOrigin.IMPORT));
        assertThat(paint.getHexColour()).isEqualTo("#8b8b8b");
        verify(paintRepository, never()).save(any());
    }

    @Test
    void reimportingTheSameDocumentReportsNothingToDo() {
        var paint = catalogueLeadbelcher();
        when(paintRepository.findAllByOwnerUserIdIsNullAndExternalIdIn(List.of("leadbelcher")))
                .thenReturn(List.of(paint));
        when(paintDraftRepository.findAllByPaintIdIn(List.of(paint.getId()))).thenReturn(List.of());

        var result =
                service.importPaints(
                        new PaintExport(
                                ExportSchema.CURRENT_VERSION,
                                List.of(
                                        new PaintExportItem("leadbelcher", "Leadbelcher")
                                                .brand("Citadel")
                                                .paintType(PaintMapper.toDto(PaintType.BASE))
                                                .hexColour("#8b8b8b"))));

        assertThat(result.getCreated()).isEmpty();
        assertThat(result.getPendingChanges()).isEmpty();
        assertThat(result.getUnchanged()).isEqualTo(1);
    }

    @Test
    void aHandAuthoredPaintIsMatchedByItsUuidRatherThanDuplicated() {
        var handAuthored =
                PaintEntity.builder().id(UUID.randomUUID()).name("House mix").build();
        var sourceId = handAuthored.getId().toString();
        when(paintRepository.findAllByOwnerUserIdIsNullAndExternalIdIn(List.of(sourceId)))
                .thenReturn(List.of());
        when(paintRepository.findById(handAuthored.getId())).thenReturn(Optional.of(handAuthored));
        when(paintDraftRepository.findAllByPaintIdIn(List.of(handAuthored.getId())))
                .thenReturn(List.of());

        var result =
                service.importPaints(
                        new PaintExport(
                                ExportSchema.CURRENT_VERSION,
                                List.of(new PaintExportItem(sourceId, "House mix"))));

        assertThat(result.getCreated()).isEmpty();
        assertThat(result.getUnchanged()).isEqualTo(1);
        verify(paintRepository, never()).save(any());
    }

    @Test
    void anImportNeverTouchesSomeonesPersonalPaintThatHappensToShareAnId() {
        var personal =
                PaintEntity.builder()
                        .id(UUID.randomUUID())
                        .ownerUserId(UUID.randomUUID())
                        .name("Someone's mix")
                        .build();
        var sourceId = personal.getId().toString();
        when(paintRepository.findAllByOwnerUserIdIsNullAndExternalIdIn(List.of(sourceId)))
                .thenReturn(List.of());
        when(paintRepository.findById(personal.getId())).thenReturn(Optional.of(personal));
        when(paintRepository.findClash(null, "Renamed", null)).thenReturn(Optional.empty());

        var result =
                service.importPaints(
                        new PaintExport(
                                ExportSchema.CURRENT_VERSION,
                                List.of(new PaintExportItem(sourceId, "Renamed"))));

        // Treated as unknown and added to the catalogue; the personal paint keeps its name.
        assertThat(result.getCreated()).hasSize(1);
        assertThat(personal.getName()).isEqualTo("Someone's mix");
        verify(paintDraftRepository, never()).save(any());
    }
}

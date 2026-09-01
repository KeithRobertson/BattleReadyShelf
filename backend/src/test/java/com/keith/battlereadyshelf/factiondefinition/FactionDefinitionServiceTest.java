package com.keith.battlereadyshelf.factiondefinition;

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
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.generated.model.Faction;
import com.keith.battlereadyshelf.generated.model.FactionExport;
import com.keith.battlereadyshelf.generated.model.FactionExportItem;
import com.keith.battlereadyshelf.generated.model.UpdateFactionRequest;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionRepository;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;
import com.keith.battlereadyshelf.user.Role;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class FactionDefinitionServiceTest {
    private static final CurrentAuthenticatedUser ADMIN =
            new CurrentAuthenticatedUser(
                    UUID.randomUUID(), "admin@example.com", Role.ADMIN, Instant.now(), Instant.now());

    @Mock private FactionRepository factionRepository;
    @Mock private FactionDraftRepository factionDraftRepository;
    @Mock private FactionDefinitionMapper factionDefinitionMapper;
    @Mock private ModelDefinitionRepository modelDefinitionRepository;
    @Mock private DefinitionPublishAuditService definitionPublishAuditService;

    private FactionDefinitionService service;

    @BeforeEach
    void setUp() {
        service =
                new FactionDefinitionService(
                        factionRepository,
                        factionDraftRepository,
                        factionDefinitionMapper,
                        modelDefinitionRepository,
                        definitionPublishAuditService);
        lenient()
                .when(factionDefinitionMapper.toDto(any(FactionEntity.class)))
                .thenAnswer(
                        invocation -> {
                            FactionEntity entity = invocation.getArgument(0);
                            return new Faction(entity.getId(), entity.getExternalId(), entity.getName());
                        });
        lenient().when(modelDefinitionRepository.countByFaction()).thenReturn(List.of());
        lenient()
                .when(factionDraftRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            // Mirrors persist: an id is assigned, but nothing else is filled in for
                            // us. A draft is read back as a DTO in the same transaction, so any
                            // field the service forgets to set has to surface here.
                            FactionDraftEntity draft = invocation.getArgument(0);
                            if (draft.getId() == null) {
                                draft.setId(UUID.randomUUID());
                            }
                            return draft;
                        });
    }

    @Test
    void exportEmitsParentLinksAsSourceIdsInStableOrder() {
        var parentId = UUID.randomUUID();
        var parent = faction(parentId, "aeldari", "Aeldari", null);
        var child = faction(UUID.randomUUID(), "asuryani", "Asuryani", parentId);

        // Deliberately out of order: the export must not depend on how the rows come back.
        when(factionRepository.findAll()).thenReturn(List.of(child, parent));

        var result = service.exportFactions();

        assertThat(result.getSchemaVersion()).isEqualTo(4);
        assertThat(result.getFactions())
                .extracting(FactionExportItem::getId)
                .containsExactly("aeldari", "asuryani");
        assertThat(result.getFactions().get(1).getParentFactionId()).isEqualTo("aeldari");
        assertThat(result.getFactions().getFirst().getParentFactionId()).isNull();
    }

    @Test
    void importCreatesNewFactionsAndResolvesParentsDefinedInTheSameDocument() {
        when(factionRepository.findAll()).thenReturn(List.of());
        when(factionRepository.save(any())).thenAnswer(FactionDefinitionServiceTest::saveWithId);

        // The child is listed first, so its parent is only known once the whole document is read.
        var export =
                new FactionExport(
                        4,
                        List.of(
                                new FactionExportItem("asuryani", "Asuryani").parentFactionId("aeldari"),
                                new FactionExportItem("aeldari", "Aeldari")));

        var result = service.importFactions(export);

        assertThat(result.getCreated()).hasSize(2);
        assertThat(result.getPendingChanges()).isEmpty();
        assertThat(result.getUnchanged()).isZero();
    }

    @Test
    void reimportOfAnUnchangedDocumentWritesNothing() {
        var parentId = UUID.randomUUID();
        var parent = faction(parentId, "aeldari", "Aeldari", null);
        var child = faction(UUID.randomUUID(), "asuryani", "Asuryani", parentId);

        when(factionRepository.findAll()).thenReturn(List.of(parent, child));

        var export =
                new FactionExport(
                        4,
                        List.of(
                                new FactionExportItem("aeldari", "Aeldari"),
                                new FactionExportItem("asuryani", "Asuryani").parentFactionId("aeldari")));

        var result = service.importFactions(export);

        assertThat(result.getUnchanged()).isEqualTo(2);
        assertThat(result.getCreated()).isEmpty();
        assertThat(result.getPendingChanges()).isEmpty();
        verify(factionRepository, never()).save(any());
        verify(factionDraftRepository, never()).save(any());
    }

    @Test
    void importStagesAClearedParentLinkRatherThanApplyingIt() {
        // The document is authoritative for a faction it names, so a parent it no longer declares
        // is a proposed removal - but reparenting moves every model beneath it, so an admin decides.
        var parentId = UUID.randomUUID();
        var parent = faction(parentId, "aeldari", "Aeldari", null);
        var child = faction(UUID.randomUUID(), "asuryani", "Asuryani", parentId);

        when(factionRepository.findAll()).thenReturn(List.of(parent, child));

        var export =
                new FactionExport(
                        4,
                        List.of(
                                new FactionExportItem("aeldari", "Aeldari"),
                                new FactionExportItem("asuryani", "Asuryani")));

        var result = service.importFactions(export);

        assertThat(child.getParentFactionId()).isEqualTo(parentId);
        assertThat(result.getPendingChanges())
                .singleElement()
                .satisfies(
                        draft -> {
                            assertThat(draft.getExternalId()).isEqualTo("asuryani");
                            assertThat(draft.getCurrentParentFactionId()).isEqualTo(parentId);
                            assertThat(draft.getProposedParentFactionId()).isNull();
                        });
        assertThat(result.getUnchanged()).isEqualTo(1);
        verify(factionRepository, never()).save(any());
    }

    @Test
    void importStagesARenameRatherThanApplyingIt() {
        var existing = faction(UUID.randomUUID(), "aeldari", "Eldar", null);
        when(factionRepository.findAll()).thenReturn(List.of(existing));

        var export = new FactionExport(4, List.of(new FactionExportItem("aeldari", "Aeldari")));

        var result = service.importFactions(export);

        assertThat(existing.getName()).isEqualTo("Eldar");
        assertThat(result.getPendingChanges())
                .singleElement()
                .satisfies(
                        draft -> {
                            assertThat(draft.getCurrentName()).isEqualTo("Eldar");
                            assertThat(draft.getProposedName()).isEqualTo("Aeldari");
                            assertThat(draft.getCreatedAt()).isNotNull();
                            assertThat(draft.getOrigin())
                                    .isEqualTo(
                                            com.keith.battlereadyshelf.generated.model.ProposalOrigin
                                                    .IMPORT);
                        });
    }

    @Test
    void reimportingAnAlreadyStagedChangeRefreshesTheSameDraftRatherThanRaisingAnother() {
        var existing = faction(UUID.randomUUID(), "aeldari", "Eldar", null);
        var pending = draft(existing, "Aeldari", null, ProposalOrigin.IMPORT);

        when(factionRepository.findAll()).thenReturn(List.of(existing));
        when(factionDraftRepository.findAllByFactionId(any()))
                .thenReturn(Map.of(existing.getId(), pending));

        var export = new FactionExport(4, List.of(new FactionExportItem("aeldari", "Aeldari")));

        var result = service.importFactions(export);

        assertThat(result.getPendingChanges())
                .singleElement()
                .satisfies(dto -> assertThat(dto.getId()).isEqualTo(pending.getId()));
        verify(factionDraftRepository, never()).delete(any());
    }

    @Test
    void proposingTheStoredStateClearsAnyStalePendingChange() {
        var existing = faction(UUID.randomUUID(), "aeldari", "Aeldari", null);
        var stale = draft(existing, "Eldar", null, ProposalOrigin.IMPORT);

        when(factionRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
        when(factionDraftRepository.findByFactionId(existing.getId())).thenReturn(Optional.of(stale));

        var result = service.proposeFactionChange(existing.getId(), new UpdateFactionRequest("Aeldari"));

        assertThat(result).isNull();
        verify(factionDraftRepository).delete(stale);
    }

    @Test
    void proposingAChangeStagesItWithoutTouchingTheStoredFaction() {
        var existing = faction(UUID.randomUUID(), "aeldari", "Eldar", null);

        when(factionRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
        when(factionDraftRepository.findByFactionId(existing.getId())).thenReturn(Optional.empty());

        var result = service.proposeFactionChange(existing.getId(), new UpdateFactionRequest("Aeldari"));

        assertThat(result).isNotNull();
        assertThat(result.getProposedName()).isEqualTo("Aeldari");
        assertThat(result.getOrigin())
                .isEqualTo(com.keith.battlereadyshelf.generated.model.ProposalOrigin.ADMIN);
        assertThat(existing.getName()).isEqualTo("Eldar");
        verify(factionRepository, never()).save(any());
    }

    @Test
    void proposingAFactionAsItsOwnParentIsRejected() {
        var existing = faction(UUID.randomUUID(), "aeldari", "Aeldari", null);
        when(factionRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        var request = new UpdateFactionRequest("Aeldari").parentFactionId(existing.getId());

        assertThatThrownBy(() -> service.proposeFactionChange(existing.getId(), request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("own parent");
    }

    @Test
    void proposingADescendantAsTheParentIsRejected() {
        // Walking a cycle would never terminate, so it has to be refused up front.
        var parent = faction(UUID.randomUUID(), "aeldari", "Aeldari", null);
        var child = faction(UUID.randomUUID(), "asuryani", "Asuryani", parent.getId());

        when(factionRepository.findById(parent.getId())).thenReturn(Optional.of(parent));
        when(factionRepository.findAll()).thenReturn(List.of(parent, child));

        var request = new UpdateFactionRequest("Aeldari").parentFactionId(child.getId());

        assertThatThrownBy(() -> service.proposeFactionChange(parent.getId(), request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("beneath this one");
    }

    @Test
    void publishingAppliesTheDraftAndRecordsBothStates() {
        var existing = faction(UUID.randomUUID(), "aeldari", "Eldar", null);
        var pending = draft(existing, "Aeldari", null, ProposalOrigin.IMPORT);

        when(factionDraftRepository.findById(pending.getId())).thenReturn(Optional.of(pending));
        when(factionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var published = service.publishFactionDraft(ADMIN, pending.getId());

        assertThat(published.getName()).isEqualTo("Aeldari");
        assertThat(existing.getName()).isEqualTo("Aeldari");
        verify(factionDraftRepository).delete(pending);
        verify(definitionPublishAuditService)
                .record(
                        eq(Definition.FACTION),
                        eq(existing.getId()),
                        eq(ADMIN.id()),
                        eq(ProposalOrigin.IMPORT),
                        any(),
                        any());
    }

    @Test
    void discardingLeavesTheStoredFactionAlone() {
        var existing = faction(UUID.randomUUID(), "aeldari", "Eldar", null);
        var pending = draft(existing, "Aeldari", null, ProposalOrigin.IMPORT);

        when(factionDraftRepository.findById(pending.getId())).thenReturn(Optional.of(pending));

        service.discardFactionDraft(pending.getId());

        assertThat(existing.getName()).isEqualTo("Eldar");
        verify(factionDraftRepository).delete(pending);
        verify(factionRepository, never()).save(any());
    }

    @Test
    void importRejectsAParentThatIsNotInTheDocument() {
        when(factionRepository.findAll()).thenReturn(List.of());
        when(factionRepository.save(any())).thenAnswer(FactionDefinitionServiceTest::saveWithId);

        var export =
                new FactionExport(
                        4,
                        List.of(new FactionExportItem("asuryani", "Asuryani").parentFactionId("aeldari")));

        assertThatThrownBy(() -> service.importFactions(export))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("aeldari");
    }

    @Test
    void importRejectsSchemaVersionsOlderThanTheSupportedRange() {
        var export = new FactionExport(2, List.of());

        assertThatThrownBy(() -> service.importFactions(export))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("faction");
    }

    private static FactionEntity saveWithId(org.mockito.invocation.InvocationOnMock invocation) {
        FactionEntity entity = invocation.getArgument(0);
        if (entity.getId() == null) {
            entity.setId(UUID.randomUUID());
        }
        return entity;
    }

    private static FactionEntity faction(UUID id, String externalId, String name, UUID parentId) {
        return FactionEntity.builder()
                .id(id)
                .externalId(externalId)
                .name(name)
                .parentFactionId(parentId)
                .build();
    }

    private static FactionDraftEntity draft(
            FactionEntity faction, String proposedName, UUID proposedParentId, ProposalOrigin origin) {
        return FactionDraftEntity.builder()
                .id(UUID.randomUUID())
                .faction(faction)
                .proposedName(proposedName)
                .proposedParentFactionId(proposedParentId)
                .origin(origin)
                .createdAt(Instant.now())
                .build();
    }
}

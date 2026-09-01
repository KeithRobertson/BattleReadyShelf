package com.keith.battlereadyshelf.modeldefinition;

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
import com.keith.battlereadyshelf.generated.model.WargearDefinitionExport;
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
class WargearDefinitionServiceTest {
    private static final CurrentAuthenticatedUser ADMIN =
            new CurrentAuthenticatedUser(
                    UUID.randomUUID(), "admin@example.com", Role.ADMIN, Instant.now(), Instant.now());

    @Mock private WargearDefinitionRepository wargearDefinitionRepository;
    @Mock private WargearDefinitionDraftRepository wargearDefinitionDraftRepository;
    @Mock private WargearOptionRepository wargearOptionRepository;
    @Mock private DefinitionPublishAuditService definitionPublishAuditService;

    private WargearDefinitionService service;

    @BeforeEach
    void setUp() {
        service =
                new WargearDefinitionService(
                        wargearDefinitionRepository,
                        wargearDefinitionDraftRepository,
                        wargearOptionRepository,
                        definitionPublishAuditService);
        lenient()
                .when(wargearOptionRepository.countUsagesByWargearDefinition())
                .thenReturn(List.of());
    }

    @Test
    void exportIncludesWargearNoModelDefinitionUsesAndSortsByStableId() {
        var unused = definition("zzz_relic_blade", "Relic Blade");
        var used = definition("boltgun", "Boltgun");

        when(wargearDefinitionRepository.findAll()).thenReturn(List.of(unused, used));

        var result = service.exportWargearDefinitions();

        assertThat(result.getSchemaVersion()).isEqualTo(4);
        assertThat(result.getWargear())
                .extracting(WargearExportItem::getId)
                .containsExactly("boltgun", "zzz_relic_blade");
    }

    @Test
    void exportFallsBackToTheUuidForHandAuthoredWargear() {
        var handAuthored = definition(null, "Custom Weapon");

        when(wargearDefinitionRepository.findAll()).thenReturn(List.of(handAuthored));

        assertThat(service.exportWargearDefinitions().getWargear())
                .singleElement()
                .satisfies(
                        item -> assertThat(item.getId()).isEqualTo(handAuthored.getId().toString()));
    }

    @Test
    void importCreatesDefinitionsTheCatalogueDoesNotHaveYet() {
        when(wargearDefinitionRepository.findAllByExternalIdIn(List.of("boltgun")))
                .thenReturn(List.of());
        when(wargearDefinitionRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            WargearDefinitionEntity entity = invocation.getArgument(0);
                            entity.setId(UUID.randomUUID());
                            return entity;
                        });

        var result =
                service.importWargearDefinitions(
                        new WargearDefinitionExport(4, List.of(new WargearExportItem("boltgun", "Boltgun"))));

        assertThat(result.getCreated())
                .singleElement()
                .satisfies(created -> assertThat(created.getName()).isEqualTo("Boltgun"));
        assertThat(result.getPendingChanges()).isEmpty();
        assertThat(result.getUnchanged()).isZero();
    }

    @Test
    void importStagesARenameForReviewInsteadOfApplyingItInPlace() {
        // One definition backs every model carrying the item, so an unattended rename would fan out
        // across the catalogue and could silently undo a correction an admin made in the app.
        var shurikenPistol = definition("shuriken_pistol", "Shuriken pistol");

        when(wargearDefinitionRepository.findAllByExternalIdIn(List.of("shuriken_pistol")))
                .thenReturn(List.of(shurikenPistol));
        when(wargearDefinitionDraftRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            WargearDefinitionDraftEntity draft = invocation.getArgument(0);
                            draft.setId(UUID.randomUUID());
                            return draft;
                        });

        var result =
                service.importWargearDefinitions(
                        new WargearDefinitionExport(
                                4, List.of(new WargearExportItem("shuriken_pistol", "Shuriken Pistol"))));

        assertThat(shurikenPistol.getName()).isEqualTo("Shuriken pistol");
        verify(wargearDefinitionRepository, never()).save(any());

        var staged = ArgumentCaptor.forClass(WargearDefinitionDraftEntity.class);
        verify(wargearDefinitionDraftRepository).save(staged.capture());
        assertThat(staged.getValue().getProposedName()).isEqualTo("Shuriken Pistol");
        assertThat(staged.getValue().getWargearDefinition()).isSameAs(shurikenPistol);
        assertThat(result.getPendingChanges())
                .singleElement()
                .satisfies(
                        pending -> {
                            assertThat(pending.getCurrentName()).isEqualTo("Shuriken pistol");
                            assertThat(pending.getProposedName()).isEqualTo("Shuriken Pistol");
                        });
    }

    @Test
    void reimportOfAnUnchangedDocumentClearsAStalePendingRename() {
        // Otherwise an admin is asked to approve a rename that is already in effect.
        var shurikenPistol = definition("shuriken_pistol", "Shuriken Pistol");
        var stale =
                WargearDefinitionDraftEntity.builder()
                        .id(UUID.randomUUID())
                        .wargearDefinition(shurikenPistol)
                        .proposedName("Shuriken pistol")
                        .createdAt(Instant.now())
                        .build();

        when(wargearDefinitionRepository.findAllByExternalIdIn(List.of("shuriken_pistol")))
                .thenReturn(List.of(shurikenPistol));
        when(wargearDefinitionDraftRepository.findAllByDefinitionId(List.of(shurikenPistol.getId())))
                .thenReturn(Map.of(shurikenPistol.getId(), stale));

        var result =
                service.importWargearDefinitions(
                        new WargearDefinitionExport(
                                4, List.of(new WargearExportItem("shuriken_pistol", "Shuriken Pistol"))));

        verify(wargearDefinitionDraftRepository).delete(stale);
        verify(wargearDefinitionDraftRepository, never()).save(any());
        assertThat(result.getUnchanged()).isEqualTo(1);
        assertThat(result.getPendingChanges()).isEmpty();
    }

    @Test
    void importResolvesHandAuthoredWargearByTheUuidTheExportEmitted() {
        // Round-tripping an export of hand-authored wargear must find the original definition,
        // not create a second one keyed by the UUID it was exported under.
        var handAuthored = definition(null, "Custom Weapon");
        var sourceId = handAuthored.getId().toString();

        when(wargearDefinitionRepository.findAllByExternalIdIn(List.of(sourceId)))
                .thenReturn(List.of());
        when(wargearDefinitionRepository.findById(handAuthored.getId()))
                .thenReturn(Optional.of(handAuthored));

        var result =
                service.importWargearDefinitions(
                        new WargearDefinitionExport(
                                4, List.of(new WargearExportItem(sourceId, "Custom Weapon"))));

        verify(wargearDefinitionRepository, never()).save(any());
        assertThat(result.getUnchanged()).isEqualTo(1);
        assertThat(result.getCreated()).isEmpty();
    }

    @Test
    void publishingADraftAppliesTheProposedNameToTheSharedDefinition() {
        var shurikenPistol = definition("shuriken_pistol", "Shuriken pistol");
        var draft = draft(shurikenPistol, "Shuriken Pistol", ProposalOrigin.IMPORT);

        when(wargearDefinitionDraftRepository.findById(draft.getId())).thenReturn(Optional.of(draft));
        when(wargearDefinitionRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var result = service.publishWargearDefinitionDraft(ADMIN, draft.getId());

        assertThat(result.getName()).isEqualTo("Shuriken Pistol");
        assertThat(shurikenPistol.getName()).isEqualTo("Shuriken Pistol");
        verify(wargearDefinitionDraftRepository).delete(draft);
        verify(definitionPublishAuditService)
                .record(
                        eq(Definition.WARGEAR),
                        eq(shurikenPistol.getId()),
                        eq(ADMIN.id()),
                        eq(ProposalOrigin.IMPORT),
                        any(),
                        any());
    }

    @Test
    void anAdminRenameIsStagedRatherThanWrittenThrough() {
        // A hand rename fans out just as widely as an imported one, so it is held to the same bar.
        var shurikenPistol = definition("shuriken_pistol", "Shuriken pistol");

        when(wargearDefinitionRepository.findById(shurikenPistol.getId()))
                .thenReturn(Optional.of(shurikenPistol));
        when(wargearDefinitionDraftRepository.findByWargearDefinitionId(shurikenPistol.getId()))
                .thenReturn(Optional.empty());
        when(wargearDefinitionDraftRepository.save(any())).thenAnswer(WargearDefinitionServiceTest::saveDraft);

        var staged =
                service.proposeWargearDefinitionRename(shurikenPistol.getId(), "Shuriken Pistol");

        assertThat(staged).isNotNull();
        assertThat(staged.getProposedName()).isEqualTo("Shuriken Pistol");
        assertThat(staged.getOrigin())
                .isEqualTo(com.keith.battlereadyshelf.generated.model.ProposalOrigin.ADMIN);
        assertThat(shurikenPistol.getName()).isEqualTo("Shuriken pistol");
        verify(wargearDefinitionRepository, never()).save(any());
    }

    @Test
    void proposingTheStoredNameStagesNothingAndClearsAStaleDraft() {
        var shurikenPistol = definition("shuriken_pistol", "Shuriken Pistol");
        var stale = draft(shurikenPistol, "Shuriken pistol", ProposalOrigin.IMPORT);

        when(wargearDefinitionRepository.findById(shurikenPistol.getId()))
                .thenReturn(Optional.of(shurikenPistol));
        when(wargearDefinitionDraftRepository.findByWargearDefinitionId(shurikenPistol.getId()))
                .thenReturn(Optional.of(stale));

        var staged =
                service.proposeWargearDefinitionRename(shurikenPistol.getId(), "Shuriken Pistol");

        assertThat(staged).isNull();
        verify(wargearDefinitionDraftRepository).delete(stale);
        verify(wargearDefinitionDraftRepository, never()).save(any());
    }

    @Test
    void importRejectsSchemaVersionsOlderThanTheSupportedRange() {
        var export = new WargearDefinitionExport(2, List.of());

        assertThatThrownBy(() -> service.importWargearDefinitions(export))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("wargear");
    }

    private static WargearDefinitionDraftEntity saveDraft(
            org.mockito.invocation.InvocationOnMock invocation) {
        // Mirrors persist: an id is assigned, but nothing else is filled in for us.
        WargearDefinitionDraftEntity draft = invocation.getArgument(0);
        if (draft.getId() == null) {
            draft.setId(UUID.randomUUID());
        }
        return draft;
    }

    private static WargearDefinitionDraftEntity draft(
            WargearDefinitionEntity definition, String proposedName, ProposalOrigin origin) {
        return WargearDefinitionDraftEntity.builder()
                .id(UUID.randomUUID())
                .wargearDefinition(definition)
                .proposedName(proposedName)
                .origin(origin)
                .createdAt(Instant.now())
                .build();
    }

    private static WargearDefinitionEntity definition(String externalId, String name) {
        return WargearDefinitionEntity.builder()
                .id(UUID.randomUUID())
                .externalId(externalId)
                .name(name)
                .build();
    }
}

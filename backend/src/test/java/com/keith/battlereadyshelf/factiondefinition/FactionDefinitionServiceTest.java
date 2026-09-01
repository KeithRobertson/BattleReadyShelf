package com.keith.battlereadyshelf.factiondefinition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.generated.model.Faction;
import com.keith.battlereadyshelf.generated.model.FactionExport;
import com.keith.battlereadyshelf.generated.model.FactionExportItem;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class FactionDefinitionServiceTest {
    @Mock private FactionRepository factionRepository;
    @Mock private FactionDefinitionMapper factionDefinitionMapper;

    private FactionDefinitionService service;

    @BeforeEach
    void setUp() {
        service = new FactionDefinitionService(factionRepository, factionDefinitionMapper);
        lenient()
                .when(factionDefinitionMapper.toDto(any(FactionEntity.class)))
                .thenAnswer(
                        invocation -> {
                            FactionEntity entity = invocation.getArgument(0);
                            return new Faction(entity.getId(), entity.getExternalId(), entity.getName());
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
        when(factionRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            FactionEntity entity = invocation.getArgument(0);
                            if (entity.getId() == null) {
                                entity.setId(UUID.randomUUID());
                            }
                            return entity;
                        });

        // The child is listed first, so its parent is only known once the whole document is read.
        var export =
                new FactionExport(
                        4,
                        List.of(
                                new FactionExportItem("asuryani", "Asuryani").parentFactionId("aeldari"),
                                new FactionExportItem("aeldari", "Aeldari")));

        var result = service.importFactions(export);

        assertThat(result.getCreated()).hasSize(2);
        assertThat(result.getUpdated()).isEmpty();
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
        assertThat(result.getUpdated()).isEmpty();
        verify(factionRepository, never()).save(any());
    }

    @Test
    void importClearsAParentLinkTheDocumentOmits() {
        // The document is authoritative for a faction it names, so a parent it no longer declares
        // must be removed rather than silently kept from an earlier import.
        var parentId = UUID.randomUUID();
        var parent = faction(parentId, "aeldari", "Aeldari", null);
        var child = faction(UUID.randomUUID(), "asuryani", "Asuryani", parentId);

        when(factionRepository.findAll()).thenReturn(List.of(parent, child));
        when(factionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var export =
                new FactionExport(
                        4,
                        List.of(
                                new FactionExportItem("aeldari", "Aeldari"),
                                new FactionExportItem("asuryani", "Asuryani")));

        var result = service.importFactions(export);

        assertThat(child.getParentFactionId()).isNull();
        assertThat(result.getUpdated()).hasSize(1);
        assertThat(result.getUnchanged()).isEqualTo(1);
    }

    @Test
    void importRejectsAParentThatIsNotInTheDocument() {
        when(factionRepository.findAll()).thenReturn(List.of());
        when(factionRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            FactionEntity entity = invocation.getArgument(0);
                            entity.setId(UUID.randomUUID());
                            return entity;
                        });

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

    private static FactionEntity faction(UUID id, String externalId, String name, UUID parentId) {
        return FactionEntity.builder()
                .id(id)
                .externalId(externalId)
                .name(name)
                .parentFactionId(parentId)
                .build();
    }
}

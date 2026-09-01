package com.keith.battlereadyshelf.factiondefinition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.ConflictException;
import com.keith.battlereadyshelf.error.NotFoundException;
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
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class PersonalFactionServiceTest {
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID OTHER_USER_ID = UUID.randomUUID();
    private static final CurrentAuthenticatedUser CURRENT_USER =
            new CurrentAuthenticatedUser(
                    USER_ID, "user@example.com", Role.USER, Instant.now(), Instant.now());

    @Mock private FactionRepository factionRepository;
    @Mock private ModelDefinitionRepository modelDefinitionRepository;

    private PersonalFactionService service;

    @BeforeEach
    void setUp() {
        service =
                new PersonalFactionService(
                        factionRepository,
                        new FactionDefinitionMapperImpl(),
                        modelDefinitionRepository,
                        new FactionCycleGuard(factionRepository));

        lenient()
                .when(factionRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            FactionEntity entity = invocation.getArgument(0);
                            if (entity.getId() == null) {
                                entity.setId(UUID.randomUUID());
                            }
                            return entity;
                        });
    }

    private static FactionEntity shared(String name) {
        return FactionEntity.builder()
                .id(UUID.randomUUID())
                .externalId(name.toLowerCase())
                .name(name)
                .build();
    }

    private static FactionEntity owned(UUID ownerUserId, String name) {
        return FactionEntity.builder().id(UUID.randomUUID()).ownerUserId(ownerUserId).name(name).build();
    }

    @Test
    void getSharedFactionsExcludesPersonalRows() {
        when(factionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of(shared("Ultramarines")));

        assertThat(service.getSharedFactions()).extracting("name").containsExactly("Ultramarines");
        verify(factionRepository, never()).findAll();
    }

    @Test
    void createMyFactionStampsTheOwnerAndLeavesTheDatasetIdUnset() {
        when(factionRepository.findAllByOwnerUserId(USER_ID)).thenReturn(List.of());

        var created = service.createMyFaction(CURRENT_USER, new UpdateFactionRequest("Sons of Keith"));

        assertThat(created.getName()).isEqualTo("Sons of Keith");
        assertThat(created.getOwnerUserId()).isEqualTo(USER_ID);
        assertThat(created.getBaseFactionId()).isNull();
        assertThat(created.getExternalId()).isNull();
    }

    @Test
    void createMyFactionRejectsANameTheUserAlreadyUses() {
        when(factionRepository.findAllByOwnerUserId(USER_ID)).thenReturn(List.of(owned(USER_ID, "Sons of Keith")));

        assertThatThrownBy(() -> service.createMyFaction(CURRENT_USER, new UpdateFactionRequest("sons of keith")))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void createMyFactionRejectsABlankName() {
        assertThatThrownBy(() -> service.createMyFaction(CURRENT_USER, new UpdateFactionRequest("  ")))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void anotherUsersFactionCannotBeUsedAsAParentAndIsReportedAsAMiss() {
        var theirs = owned(OTHER_USER_ID, "Theirs");
        when(factionRepository.findById(theirs.getId())).thenReturn(Optional.of(theirs));

        var request = new UpdateFactionRequest("Mine").parentFactionId(theirs.getId());

        assertThatThrownBy(() -> service.createMyFaction(CURRENT_USER, request))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void customiseFactionForksTheSharedRowAndRecordsItsLineage() {
        var base = shared("Gundabad");
        when(factionRepository.findByOwnerUserIdAndBaseFactionId(USER_ID, base.getId()))
                .thenReturn(Optional.empty());
        when(factionRepository.findById(base.getId())).thenReturn(Optional.of(base));

        var fork = service.customiseFaction(CURRENT_USER, base.getId());

        assertThat(fork.getName()).isEqualTo("Gundabad");
        assertThat(fork.getOwnerUserId()).isEqualTo(USER_ID);
        assertThat(fork.getBaseFactionId()).isEqualTo(base.getId());
        assertThat(fork.getExternalId()).isNull();
    }

    @Test
    void customiseFactionIsIdempotent() {
        var base = shared("Gundabad");
        var existing =
                FactionEntity.builder()
                        .id(UUID.randomUUID())
                        .ownerUserId(USER_ID)
                        .baseFactionId(base.getId())
                        .name("Gundabad orcs")
                        .build();
        when(factionRepository.findByOwnerUserIdAndBaseFactionId(USER_ID, base.getId()))
                .thenReturn(Optional.of(existing));

        var fork = service.customiseFaction(CURRENT_USER, base.getId());

        assertThat(fork.getId()).isEqualTo(existing.getId());
        assertThat(fork.getName()).isEqualTo("Gundabad orcs");
        verify(factionRepository, never()).save(any());
    }

    @Test
    void customiseFactionRefusesAFactionThatAlreadyBelongsToSomeone() {
        var theirs = owned(OTHER_USER_ID, "Theirs");
        when(factionRepository.findByOwnerUserIdAndBaseFactionId(USER_ID, theirs.getId()))
                .thenReturn(Optional.empty());
        when(factionRepository.findById(theirs.getId())).thenReturn(Optional.of(theirs));

        assertThatThrownBy(() -> service.customiseFaction(CURRENT_USER, theirs.getId()))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void updateMyFactionRefusesAFactionOwnedBySomeoneElse() {
        var theirs = owned(OTHER_USER_ID, "Theirs");
        when(factionRepository.findByIdAndOwnerUserId(theirs.getId(), USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () -> service.updateMyFaction(CURRENT_USER, theirs.getId(), new UpdateFactionRequest("Mine")))
                .isInstanceOf(NotFoundException.class);
        verify(factionRepository, never()).save(any());
    }

    @Test
    void updateMyFactionRenamesInPlace() {
        var mine = owned(USER_ID, "Gundabad");
        when(factionRepository.findByIdAndOwnerUserId(mine.getId(), USER_ID)).thenReturn(Optional.of(mine));
        when(factionRepository.findAllByOwnerUserId(USER_ID)).thenReturn(List.of(mine));

        var updated = service.updateMyFaction(CURRENT_USER, mine.getId(), new UpdateFactionRequest("Gundabad orcs"));

        assertThat(updated.getName()).isEqualTo("Gundabad orcs");
        assertThat(updated.getId()).isEqualTo(mine.getId());
    }

    @Test
    void deleteMyFactionRefusesWhileModelDefinitionsStillBelongToIt() {
        var mine = owned(USER_ID, "Mine");
        when(factionRepository.findByIdAndOwnerUserId(mine.getId(), USER_ID)).thenReturn(Optional.of(mine));
        when(modelDefinitionRepository.countByFactionId(mine.getId())).thenReturn(3L);

        assertThatThrownBy(() -> service.deleteMyFaction(CURRENT_USER, mine.getId()))
                .isInstanceOf(ConflictException.class);
        verify(factionRepository, never()).deleteById(any());
    }

    @Test
    void deleteMyFactionRemovesAnUnusedOne() {
        var mine = owned(USER_ID, "Mine");
        when(factionRepository.findByIdAndOwnerUserId(mine.getId(), USER_ID)).thenReturn(Optional.of(mine));
        when(modelDefinitionRepository.countByFactionId(mine.getId())).thenReturn(0L);

        service.deleteMyFaction(CURRENT_USER, mine.getId());

        verify(factionRepository).deleteById(mine.getId());
    }
}

package com.keith.battlereadyshelf.modeldefinition;

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
import com.keith.battlereadyshelf.generated.model.UpdateWargearDefinitionRequest;
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
class PersonalWargearDefinitionServiceTest {
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID OTHER_USER_ID = UUID.randomUUID();
    private static final CurrentAuthenticatedUser CURRENT_USER =
            new CurrentAuthenticatedUser(
                    USER_ID, "user@example.com", Role.USER, Instant.now(), Instant.now());

    @Mock private WargearDefinitionRepository wargearDefinitionRepository;
    @Mock private WargearOptionRepository wargearOptionRepository;

    private PersonalWargearDefinitionService service;

    @BeforeEach
    void setUp() {
        service = new PersonalWargearDefinitionService(wargearDefinitionRepository, wargearOptionRepository);

        lenient()
                .when(wargearDefinitionRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            WargearDefinitionEntity entity = invocation.getArgument(0);
                            if (entity.getId() == null) {
                                entity.setId(UUID.randomUUID());
                            }
                            return entity;
                        });
    }

    private static WargearDefinitionEntity shared(String name) {
        return WargearDefinitionEntity.builder()
                .id(UUID.randomUUID())
                .externalId(name.toLowerCase().replace(' ', '_'))
                .name(name)
                .build();
    }

    private static WargearDefinitionEntity owned(UUID ownerUserId, String name) {
        return WargearDefinitionEntity.builder()
                .id(UUID.randomUUID())
                .ownerUserId(ownerUserId)
                .name(name)
                .build();
    }

    @Test
    void getSharedWargearExcludesPersonalRowsAndCountsUsageInOneQuery() {
        var bolter = shared("Bolter");
        when(wargearDefinitionRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of(bolter));
        when(wargearOptionRepository.countUsagesByWargearDefinition())
                .thenReturn(List.<Object[]>of(new Object[] {bolter.getId(), 6L}));

        var shared = service.getSharedWargearDefinitions();

        assertThat(shared).singleElement().satisfies(dto -> assertThat(dto.getUsageCount()).isEqualTo(6));
        verify(wargearOptionRepository, never()).countByWargearDefinitionId(any());
    }

    @Test
    void getMyWargearReportsZeroForSomethingNothingUsesYet() {
        when(wargearDefinitionRepository.findAllByOwnerUserId(USER_ID))
                .thenReturn(List.of(owned(USER_ID, "Keith's Special")));
        when(wargearOptionRepository.countUsagesByWargearDefinition()).thenReturn(List.of());

        assertThat(service.getMyWargearDefinitions(CURRENT_USER))
                .singleElement()
                .satisfies(dto -> assertThat(dto.getUsageCount()).isZero());
    }

    @Test
    void createMyWargearStampsTheOwnerAndLeavesTheDatasetIdUnset() {
        when(wargearDefinitionRepository.findFirstByOwnerUserIdAndNameIgnoreCase(USER_ID, "Plasma Axe"))
                .thenReturn(Optional.empty());

        var created =
                service.createMyWargearDefinition(CURRENT_USER, new UpdateWargearDefinitionRequest("Plasma Axe"));

        assertThat(created.getName()).isEqualTo("Plasma Axe");
        assertThat(created.getOwnerUserId()).isEqualTo(USER_ID);
        assertThat(created.getBaseWargearDefinitionId()).isNull();
        assertThat(created.getExternalId()).isNull();
    }

    @Test
    void createMyWargearRejectsANameTheUserAlreadyUses() {
        when(wargearDefinitionRepository.findFirstByOwnerUserIdAndNameIgnoreCase(USER_ID, "Plasma Axe"))
                .thenReturn(Optional.of(owned(USER_ID, "Plasma Axe")));

        assertThatThrownBy(
                        () ->
                                service.createMyWargearDefinition(
                                        CURRENT_USER, new UpdateWargearDefinitionRequest("Plasma Axe")))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void createMyWargearRejectsABlankName() {
        assertThatThrownBy(
                        () -> service.createMyWargearDefinition(CURRENT_USER, new UpdateWargearDefinitionRequest(" ")))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void customiseForksTheSharedRowAndRecordsItsLineage() {
        var base = shared("Combi-bolter");
        when(wargearDefinitionRepository.findByOwnerUserIdAndBaseWargearDefinitionId(USER_ID, base.getId()))
                .thenReturn(Optional.empty());
        when(wargearDefinitionRepository.findById(base.getId())).thenReturn(Optional.of(base));

        var fork = service.customiseWargearDefinition(CURRENT_USER, base.getId());

        assertThat(fork.getName()).isEqualTo("Combi-bolter");
        assertThat(fork.getOwnerUserId()).isEqualTo(USER_ID);
        assertThat(fork.getBaseWargearDefinitionId()).isEqualTo(base.getId());
        assertThat(fork.getExternalId()).isNull();
    }

    @Test
    void customiseIsIdempotent() {
        var base = shared("Combi-bolter");
        var existing =
                WargearDefinitionEntity.builder()
                        .id(UUID.randomUUID())
                        .ownerUserId(USER_ID)
                        .baseWargearDefinitionId(base.getId())
                        .name("Combi-boltgun")
                        .build();
        when(wargearDefinitionRepository.findByOwnerUserIdAndBaseWargearDefinitionId(USER_ID, base.getId()))
                .thenReturn(Optional.of(existing));

        var fork = service.customiseWargearDefinition(CURRENT_USER, base.getId());

        assertThat(fork.getId()).isEqualTo(existing.getId());
        assertThat(fork.getName()).isEqualTo("Combi-boltgun");
        verify(wargearDefinitionRepository, never()).save(any());
    }

    @Test
    void customiseRefusesWargearThatAlreadyBelongsToSomeone() {
        var theirs = owned(OTHER_USER_ID, "Theirs");
        when(wargearDefinitionRepository.findByOwnerUserIdAndBaseWargearDefinitionId(USER_ID, theirs.getId()))
                .thenReturn(Optional.empty());
        when(wargearDefinitionRepository.findById(theirs.getId())).thenReturn(Optional.of(theirs));

        assertThatThrownBy(() -> service.customiseWargearDefinition(CURRENT_USER, theirs.getId()))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void updateRefusesWargearOwnedBySomeoneElse() {
        var theirs = owned(OTHER_USER_ID, "Theirs");
        when(wargearDefinitionRepository.findByIdAndOwnerUserId(theirs.getId(), USER_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                service.updateMyWargearDefinition(
                                        CURRENT_USER, theirs.getId(), new UpdateWargearDefinitionRequest("Mine")))
                .isInstanceOf(NotFoundException.class);
        verify(wargearDefinitionRepository, never()).save(any());
    }

    @Test
    void deleteRefusesWhileOptionsStillPointAtIt() {
        var mine = owned(USER_ID, "Mine");
        when(wargearDefinitionRepository.findByIdAndOwnerUserId(mine.getId(), USER_ID))
                .thenReturn(Optional.of(mine));
        when(wargearOptionRepository.countByWargearDefinitionId(mine.getId())).thenReturn(2L);

        assertThatThrownBy(() -> service.deleteMyWargearDefinition(CURRENT_USER, mine.getId()))
                .isInstanceOf(ConflictException.class);
        verify(wargearDefinitionRepository, never()).deleteById(any());
    }

    @Test
    void deleteRemovesAnUnusedOne() {
        var mine = owned(USER_ID, "Mine");
        when(wargearDefinitionRepository.findByIdAndOwnerUserId(mine.getId(), USER_ID))
                .thenReturn(Optional.of(mine));
        when(wargearOptionRepository.countByWargearDefinitionId(mine.getId())).thenReturn(0L);

        service.deleteMyWargearDefinition(CURRENT_USER, mine.getId());

        verify(wargearDefinitionRepository).deleteById(mine.getId());
    }
}

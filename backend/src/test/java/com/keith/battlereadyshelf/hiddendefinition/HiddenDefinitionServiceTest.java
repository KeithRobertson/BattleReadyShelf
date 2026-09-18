package com.keith.battlereadyshelf.hiddendefinition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.generated.model.HiddenDefinitionType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class HiddenDefinitionServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();

    @Mock private UserHiddenModelDefinitionRepository hiddenModelDefinitions;
    @Mock private UserHiddenFactionRepository hiddenFactions;
    @Mock private UserHiddenWargearDefinitionRepository hiddenWargearDefinitions;
    @Mock private UserHiddenPaintRepository hiddenPaints;

    private HiddenDefinitionService service;

    @BeforeEach
    void setUp() {
        service =
                new HiddenDefinitionService(
                        hiddenModelDefinitions, hiddenFactions, hiddenWargearDefinitions, hiddenPaints);
    }

    @Test
    void anAnonymousCallerHasHiddenNothing() {
        assertThat(service.hiddenIds(HiddenDefinitionType.PAINT, null)).isEmpty();
        assertThat(service.hiddenModelDefinitionsFor(null)).isEqualTo(HiddenModelDefinitions.none());

        verifyNoInteractions(hiddenPaints, hiddenModelDefinitions, hiddenFactions);
    }

    @Test
    void hidingWritesOnlyWhatIsNotHiddenAlready() {
        var alreadyHidden = UUID.randomUUID();
        var newlyHidden = UUID.randomUUID();
        when(hiddenPaints.findHiddenIdsByUserId(USER_ID)).thenReturn(Set.of(alreadyHidden));

        service.setHidden(
                USER_ID, HiddenDefinitionType.PAINT, List.of(alreadyHidden, newlyHidden), true);

        verify(hiddenPaints)
                .saveAllAndFlush(
                        List.of(
                                UserHiddenPaintEntity.builder()
                                        .userId(USER_ID)
                                        .paintId(newlyHidden)
                                        .build()));
    }

    /** A page can easily send the same id twice - two selections resolving to one row, say. */
    @Test
    void aRepeatedIdIsHiddenOnce() {
        var paintId = UUID.randomUUID();

        service.setHidden(USER_ID, HiddenDefinitionType.PAINT, List.of(paintId, paintId), true);

        verify(hiddenPaints)
                .saveAllAndFlush(
                        List.of(
                                UserHiddenPaintEntity.builder().userId(USER_ID).paintId(paintId).build()));
    }

    @Test
    void hidingWhatIsAlreadyHiddenChangesNothing() {
        var paintId = UUID.randomUUID();
        when(hiddenPaints.findHiddenIdsByUserId(USER_ID)).thenReturn(Set.of(paintId));

        service.setHidden(USER_ID, HiddenDefinitionType.PAINT, List.of(paintId), true);

        verify(hiddenPaints, never()).saveAllAndFlush(any());
    }

    @Test
    void anEmptyRequestTouchesNothing() {
        service.setHidden(USER_ID, HiddenDefinitionType.PAINT, List.of(), true);
        service.setHidden(USER_ID, HiddenDefinitionType.FACTION, null, false);

        verifyNoInteractions(hiddenPaints, hiddenFactions);
    }

    @Test
    void showingDeletesOnlyThisUsersRows() {
        var paintId = UUID.randomUUID();

        service.setHidden(USER_ID, HiddenDefinitionType.PAINT, List.of(paintId), false);

        verify(hiddenPaints).deleteByUserIdAndPaintIdIn(USER_ID, List.of(paintId));
    }

    /** Showing something that was never hidden is how a page reports a toggle it has already flipped. */
    @Test
    void showingWhatWasNeverHiddenIsNotAnError() {
        service.setHidden(USER_ID, HiddenDefinitionType.FACTION, List.of(UUID.randomUUID()), false);

        verify(hiddenFactions).deleteByUserIdAndFactionIdIn(any(), any());
    }

    @Test
    void eachKindOfDefinitionKeepsItsOwnList() {
        var modelDefinitionId = UUID.randomUUID();
        var factionId = UUID.randomUUID();
        var wargearDefinitionId = UUID.randomUUID();
        var paintId = UUID.randomUUID();

        service.setHidden(
                USER_ID, HiddenDefinitionType.MODEL_DEFINITION, List.of(modelDefinitionId), true);
        service.setHidden(USER_ID, HiddenDefinitionType.FACTION, List.of(factionId), true);
        service.setHidden(
                USER_ID, HiddenDefinitionType.WARGEAR_DEFINITION, List.of(wargearDefinitionId), true);
        service.setHidden(USER_ID, HiddenDefinitionType.PAINT, List.of(paintId), true);

        verify(hiddenModelDefinitions)
                .saveAllAndFlush(
                        List.of(
                                UserHiddenModelDefinitionEntity.builder()
                                        .userId(USER_ID)
                                        .modelDefinitionId(modelDefinitionId)
                                        .build()));
        verify(hiddenFactions)
                .saveAllAndFlush(
                        List.of(
                                UserHiddenFactionEntity.builder()
                                        .userId(USER_ID)
                                        .factionId(factionId)
                                        .build()));
        verify(hiddenWargearDefinitions)
                .saveAllAndFlush(
                        List.of(
                                UserHiddenWargearDefinitionEntity.builder()
                                        .userId(USER_ID)
                                        .wargearDefinitionId(wargearDefinitionId)
                                        .build()));
        verify(hiddenPaints)
                .saveAllAndFlush(
                        List.of(
                                UserHiddenPaintEntity.builder().userId(USER_ID).paintId(paintId).build()));
    }

    /**
     * An id that is not a definition of that kind trips the foreign key. Reported as the caller's
     * mistake, which is only possible because the insert is flushed inside the service.
     */
    @Test
    void anUnknownIdIsRejectedAsABadRequest() {
        when(hiddenPaints.saveAllAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("violates foreign key constraint"));

        assertThatThrownBy(
                        () ->
                                service.setHidden(
                                        USER_ID, HiddenDefinitionType.PAINT, List.of(UUID.randomUUID()), true))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("PAINT");
    }

    @Test
    void aModelDefinitionIsHiddenEitherByNameOrByItsFaction() {
        var namedDirectly = UUID.randomUUID();
        var hiddenFactionId = UUID.randomUUID();
        when(hiddenModelDefinitions.findHiddenIdsByUserId(USER_ID)).thenReturn(Set.of(namedDirectly));
        when(hiddenFactions.findHiddenIdsByUserId(USER_ID)).thenReturn(Set.of(hiddenFactionId));

        var hidden = service.hiddenModelDefinitionsFor(USER_ID);

        assertThat(hidden.includes(namedDirectly, null)).isTrue();
        assertThat(hidden.includes(UUID.randomUUID(), hiddenFactionId)).isTrue();
        assertThat(hidden.includes(UUID.randomUUID(), UUID.randomUUID())).isFalse();
        assertThat(hidden.includes(UUID.randomUUID(), null)).isFalse();
    }
}

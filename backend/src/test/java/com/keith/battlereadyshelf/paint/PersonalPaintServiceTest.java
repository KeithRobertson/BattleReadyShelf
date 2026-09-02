package com.keith.battlereadyshelf.paint;

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
import com.keith.battlereadyshelf.generated.model.UpdatePaintRequest;
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
class PersonalPaintServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final CurrentAuthenticatedUser CURRENT_USER =
            new CurrentAuthenticatedUser(
                    USER_ID, "user@example.com", Role.USER, Instant.now(), Instant.now());

    @Mock private PaintRepository paintRepository;
    @Mock private PaintRecipeRepository paintRecipeRepository;

    private PersonalPaintService service;

    @BeforeEach
    void setUp() {
        service = new PersonalPaintService(paintRepository, paintRecipeRepository);

        lenient()
                .when(paintRepository.save(any()))
                .thenAnswer(
                        invocation -> {
                            PaintEntity entity = invocation.getArgument(0);
                            if (entity.getId() == null) {
                                entity.setId(UUID.randomUUID());
                            }
                            return entity;
                        });
    }

    private static PaintEntity shared(String brand, String name, String hexColour) {
        return PaintEntity.builder()
                .id(UUID.randomUUID())
                .externalId(name.toLowerCase().replace(' ', '_'))
                .brand(brand)
                .name(name)
                .paintType(PaintType.BASE)
                .hexColour(hexColour)
                .build();
    }

    private static UpdatePaintRequest request(String name) {
        return new UpdatePaintRequest(name);
    }

    @Test
    void visiblePaintsCombineTheCatalogueWithTheCallersOwnOrderedByBrandThenName() {
        var leadbelcher = shared("Citadel", "Leadbelcher", "#8b8b8b");
        var abaddon = shared("Citadel", "Abaddon Black", "#000000");
        var ownMix =
                PaintEntity.builder()
                        .id(UUID.randomUUID())
                        .ownerUserId(USER_ID)
                        .name("My grey")
                        .build();

        when(paintRepository.findAllByOwnerUserIdIsNull()).thenReturn(List.of(leadbelcher, abaddon));
        when(paintRepository.findAllByOwnerUserId(USER_ID)).thenReturn(List.of(ownMix));
        when(paintRecipeRepository.countUsagesByPaint())
                .thenReturn(List.<Object[]>of(new Object[] {leadbelcher.getId(), 4L}));

        var visible = service.getVisiblePaints(USER_ID);

        // Brand first, so a catalogue reads one manufacturer at a time; the brandless personal mix
        // sorts last rather than being interleaved with Citadel's range.
        assertThat(visible)
                .extracting(paint -> paint.getName())
                .containsExactly("Abaddon Black", "Leadbelcher", "My grey");
        assertThat(visible.getFirst().getUsageCount()).isZero();
        assertThat(visible.get(1).getUsageCount()).isEqualTo(4);
    }

    @Test
    void anonymousCallersSeeTheCatalogueAloneAndNoOnesPersonalPaints() {
        when(paintRepository.findAllByOwnerUserIdIsNull())
                .thenReturn(List.of(shared("Citadel", "Leadbelcher", "#8b8b8b")));

        var visible = service.getVisiblePaints(null);

        assertThat(visible).extracting(paint -> paint.getName()).containsExactly("Leadbelcher");
        verify(paintRepository, never()).findAllByOwnerUserId(any());
    }

    @Test
    void customisingCopiesEveryFieldButTheExternalIdAndRecordsTheLineage() {
        var leadbelcher = shared("Citadel", "Leadbelcher", "#8b8b8b");
        when(paintRepository.findByOwnerUserIdAndBasePaintId(USER_ID, leadbelcher.getId()))
                .thenReturn(Optional.empty());
        when(paintRepository.findById(leadbelcher.getId())).thenReturn(Optional.of(leadbelcher));

        var copy = service.customisePaint(CURRENT_USER, leadbelcher.getId());

        assertThat(copy.getOwnerUserId()).isEqualTo(USER_ID);
        assertThat(copy.getBasePaintId()).isEqualTo(leadbelcher.getId());
        assertThat(copy.getName()).isEqualTo("Leadbelcher");
        assertThat(copy.getBrand()).isEqualTo("Citadel");
        assertThat(copy.getHexColour()).isEqualTo("#8b8b8b");
        // The dataset id belongs to the catalogue row and is globally unique, so it must not travel.
        assertThat(copy.getExternalId()).isNull();
    }

    @Test
    void customisingTwiceReturnsTheSameCopyRatherThanASecondOne() {
        var basePaintId = UUID.randomUUID();
        var existing =
                PaintEntity.builder()
                        .id(UUID.randomUUID())
                        .ownerUserId(USER_ID)
                        .basePaintId(basePaintId)
                        .name("Leadbelcher")
                        .build();
        when(paintRepository.findByOwnerUserIdAndBasePaintId(USER_ID, basePaintId))
                .thenReturn(Optional.of(existing));

        var copy = service.customisePaint(CURRENT_USER, basePaintId);

        assertThat(copy.getId()).isEqualTo(existing.getId());
        verify(paintRepository, never()).save(any());
    }

    @Test
    void aPaintAlreadyOwnedBySomeoneCannotBeCustomised() {
        var personal =
                PaintEntity.builder()
                        .id(UUID.randomUUID())
                        .ownerUserId(UUID.randomUUID())
                        .name("Someone else's mix")
                        .build();
        when(paintRepository.findByOwnerUserIdAndBasePaintId(USER_ID, personal.getId()))
                .thenReturn(Optional.empty());
        when(paintRepository.findById(personal.getId())).thenReturn(Optional.of(personal));

        assertThatThrownBy(() -> service.customisePaint(CURRENT_USER, personal.getId()))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void aPaintNeedsAName() {
        assertThatThrownBy(() -> service.createMyPaint(CURRENT_USER, request("   ")))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void aColourMustBeSixDigitHex() {
        when(paintRepository.findClash(USER_ID, "Rust", null)).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                service.createMyPaint(
                                        CURRENT_USER, request("Rust").hexColour("rust brown")))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void aColourIsStoredLowercasedSoTwoSpellingsOfOneColourCompareEqual() {
        when(paintRepository.findClash(USER_ID, "Rust", null)).thenReturn(Optional.empty());

        var created = service.createMyPaint(CURRENT_USER, request("Rust").hexColour("#B4513A"));

        assertThat(created.getHexColour()).isEqualTo("#b4513a");
    }

    @Test
    void theSameNameUnderADifferentBrandIsNotAClash() {
        // Names are only unique within a manufacturer - several sell a "Bone White" - which is why
        // the clash lookup is by brand and name together.
        when(paintRepository.findClash(USER_ID, "Bone White", "Vallejo")).thenReturn(Optional.empty());

        var created = service.createMyPaint(CURRENT_USER, request("Bone White").brand("Vallejo"));

        assertThat(created.getName()).isEqualTo("Bone White");
        assertThat(created.getBrand()).isEqualTo("Vallejo");
    }

    @Test
    void reusingOnesOwnBrandAndNameIsRejected() {
        var existing =
                PaintEntity.builder()
                        .id(UUID.randomUUID())
                        .ownerUserId(USER_ID)
                        .brand("Citadel")
                        .name("Leadbelcher")
                        .build();
        when(paintRepository.findClash(USER_ID, "Leadbelcher", "Citadel"))
                .thenReturn(Optional.of(existing));

        assertThatThrownBy(
                        () ->
                                service.createMyPaint(
                                        CURRENT_USER, request("Leadbelcher").brand("Citadel")))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void aPaintStillNamedByARecipeCannotBeDeleted() {
        var paintId = UUID.randomUUID();
        when(paintRepository.findByIdAndOwnerUserId(paintId, USER_ID))
                .thenReturn(
                        Optional.of(
                                PaintEntity.builder()
                                        .id(paintId)
                                        .ownerUserId(USER_ID)
                                        .name("Mix")
                                        .build()));
        when(paintRecipeRepository.countUsagesOfPaint(paintId)).thenReturn(2L);

        assertThatThrownBy(() -> service.deleteMyPaint(CURRENT_USER, paintId))
                .isInstanceOf(ConflictException.class);
        verify(paintRepository, never()).deleteById(any());
    }

    @Test
    void anotherUsersPaintIsNotFoundRatherThanForbidden() {
        var paintId = UUID.randomUUID();
        when(paintRepository.findByIdAndOwnerUserId(paintId, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateMyPaint(CURRENT_USER, paintId, request("Anything")))
                .isInstanceOf(NotFoundException.class);
    }
}

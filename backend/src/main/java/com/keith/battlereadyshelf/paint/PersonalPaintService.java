package com.keith.battlereadyshelf.paint;

import static com.keith.battlereadyshelf.paint.PaintMapper.BY_BRAND_THEN_NAME;
import static com.keith.battlereadyshelf.paint.PaintMapper.normaliseHexColour;
import static com.keith.battlereadyshelf.paint.PaintMapper.requireName;
import static com.keith.battlereadyshelf.paint.PaintMapper.trimToNull;

import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.ConflictException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.Paint;
import com.keith.battlereadyshelf.generated.model.UpdatePaintRequest;
import com.keith.battlereadyshelf.security.CurrentAuthenticatedUser;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * A user's own paints, and the catalogue as they see it.
 *
 * <p>Unlike the admin catalogue there is no draft workflow: a personal paint is visible only to its
 * owner, so a change is live immediately and cannot surprise anyone else. The "diff" a personal
 * paint has is against the catalogue row it was forked from, not against a pending change.
 *
 * <p>Personal paints matter more here than for wargear. Painters routinely thin, mix or substitute
 * paints, and manufacturers reformulate them, so "my Leadbelcher" genuinely is a different thing
 * from the catalogue's.
 */
@Service
@RequiredArgsConstructor
public class PersonalPaintService {

    private final PaintRepository paintRepository;
    private final PaintRecipeRepository paintRecipeRepository;

    /**
     * What the caller can put in a recipe: the catalogue plus their own paints. Anonymous callers
     * see the catalogue alone, which is what makes a public collection's recipes readable without
     * signing in.
     */
    public List<Paint> getVisiblePaints(UUID currentUserId) {
        var usageCounts = usageCounts();
        var own =
                currentUserId == null
                        ? Stream.<PaintEntity>empty()
                        : paintRepository.findAllByOwnerUserId(currentUserId).stream();

        return Stream.concat(paintRepository.findAllByOwnerUserIdIsNull().stream(), own)
                .sorted(BY_BRAND_THEN_NAME)
                .map(paint -> PaintMapper.toDto(paint, usageCounts))
                .toList();
    }

    public List<Paint> getMyPaints(CurrentAuthenticatedUser currentUser) {
        var usageCounts = usageCounts();
        return paintRepository.findAllByOwnerUserId(currentUser.id()).stream()
                .sorted(BY_BRAND_THEN_NAME)
                .map(paint -> PaintMapper.toDto(paint, usageCounts))
                .toList();
    }

    /**
     * The catalogue itself. The personal page needs the originals both to offer them for
     * customisation and to diff a personal copy against.
     */
    public List<Paint> getSharedPaints() {
        var usageCounts = usageCounts();
        return paintRepository.findAllByOwnerUserIdIsNull().stream()
                .sorted(BY_BRAND_THEN_NAME)
                .map(paint -> PaintMapper.toDto(paint, usageCounts))
                .toList();
    }

    @Transactional
    public Paint createMyPaint(CurrentAuthenticatedUser currentUser, UpdatePaintRequest request) {
        var name = requireName(request.getName());
        var brand = trimToNull(request.getBrand());
        requireSlotFree(currentUser, name, brand, null);

        return toDto(
                paintRepository.save(
                        PaintEntity.builder()
                                .ownerUserId(currentUser.id())
                                .name(name)
                                .brand(brand)
                                .paintType(PaintMapper.fromDto(request.getPaintType()))
                                .hexColour(normaliseHexColour(request.getHexColour()))
                                .build()));
    }

    /**
     * Forks a catalogue paint into one owned by this user. Idempotent: a user who already
     * customised this paint gets that copy back rather than a second one, which the unique index on
     * (owner, base) enforces at the database level too.
     *
     * <p>The copy drops {@code externalId}, which belongs to the catalogue row the reference dataset
     * owns and is globally unique. Lineage is recorded by {@code basePaintId} instead.
     *
     * <p>Forking repoints nothing: recipes that already name the catalogue paint keep doing so. The
     * fork is a paint they can use from now on.
     */
    @Transactional
    public Paint customisePaint(CurrentAuthenticatedUser currentUser, UUID paintId) {
        var existing = paintRepository.findByOwnerUserIdAndBasePaintId(currentUser.id(), paintId);
        if (existing.isPresent()) {
            return toDto(existing.get());
        }

        var shared =
                paintRepository
                        .findById(paintId)
                        .orElseThrow(() -> new NotFoundException("Paint not found: " + paintId));
        if (shared.getOwnerUserId() != null) {
            throw new BadRequestException(
                    "Only catalogue paints can be customised; " + paintId + " already belongs to a user.");
        }

        return toDto(
                paintRepository.save(
                        PaintEntity.builder()
                                .ownerUserId(currentUser.id())
                                .basePaintId(shared.getId())
                                .name(shared.getName())
                                .brand(shared.getBrand())
                                .paintType(shared.getPaintType())
                                .hexColour(shared.getHexColour())
                                .build()));
    }

    @Transactional
    public Paint updateMyPaint(
            CurrentAuthenticatedUser currentUser, UUID paintId, UpdatePaintRequest request) {
        var personal = requireOwned(currentUser, paintId);
        var name = requireName(request.getName());
        var brand = trimToNull(request.getBrand());
        requireSlotFree(currentUser, name, brand, paintId);

        personal.setName(name);
        personal.setBrand(brand);
        personal.setPaintType(PaintMapper.fromDto(request.getPaintType()));
        personal.setHexColour(normaliseHexColour(request.getHexColour()));
        return toDto(paintRepository.save(personal));
    }

    /**
     * Deletes a personal paint. For a customisation this is the "revert to the catalogue version"
     * action.
     *
     * <p>Refused while any recipe still names it: the recipe is a record of what the user actually
     * did, and dropping the paint would leave a step they can no longer identify.
     */
    @Transactional
    public void deleteMyPaint(CurrentAuthenticatedUser currentUser, UUID paintId) {
        requireOwned(currentUser, paintId);

        var inUseCount = paintRecipeRepository.countUsagesOfPaint(paintId);
        if (inUseCount > 0) {
            throw new ConflictException(
                    "Cannot delete: "
                            + inUseCount
                            + " paint recipe entr(ies) still use this paint. Remove them first.");
        }
        paintRepository.deleteById(paintId);
    }

    private PaintEntity requireOwned(CurrentAuthenticatedUser currentUser, UUID paintId) {
        return paintRepository
                .findByIdAndOwnerUserId(paintId, currentUser.id())
                .orElseThrow(() -> new NotFoundException("Paint not found: " + paintId));
    }

    /**
     * Rejects a brand and name this user already uses. Two identical personal paints would be
     * indistinguishable in the picker.
     *
     * <p>Clashing with a <em>catalogue</em> paint is allowed and is exactly what customising one
     * does.
     */
    private void requireSlotFree(
            CurrentAuthenticatedUser currentUser, String name, String brand, UUID allowedId) {
        paintRepository
                .findClash(currentUser.id(), name, brand)
                .filter(existing -> !existing.getId().equals(allowedId))
                .ifPresent(
                        existing -> {
                            throw new ConflictException(
                                    "You already have a paint called '"
                                            + name
                                            + "'"
                                            + (brand == null ? "" : " by " + brand)
                                            + ".");
                        });
    }

    private Paint toDto(PaintEntity entity) {
        return PaintMapper.toDto(entity, paintRecipeRepository.countUsagesOfPaint(entity.getId()));
    }

    /** Usage for every paint in one query, so listing a page does not fan out into a count each. */
    private Map<UUID, Long> usageCounts() {
        return paintRecipeRepository.countUsagesByPaint().stream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
    }
}

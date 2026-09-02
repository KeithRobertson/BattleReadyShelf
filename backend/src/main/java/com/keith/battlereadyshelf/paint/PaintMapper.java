package com.keith.battlereadyshelf.paint;

import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.generated.model.Paint;
import com.keith.battlereadyshelf.generated.model.PaintType;

import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Conversion and validation shared by the admin catalogue, a user's own paints and recipes, all
 * three of which hand out the same {@link Paint} representation.
 */
final class PaintMapper {

    /**
     * Matched here as well as by the database check constraint. The constraint is the guarantee;
     * this exists so a typo comes back as a 400 explaining the format rather than a 500 from a
     * constraint violation.
     */
    private static final Pattern HEX_COLOUR = Pattern.compile("^#[0-9A-Fa-f]{6}$");

    /** Brand first, so a catalogue reads as one manufacturer's range at a time. */
    static final Comparator<PaintEntity> BY_BRAND_THEN_NAME =
            Comparator.comparing(
                            PaintEntity::getBrand,
                            Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                    .thenComparing(PaintEntity::getName, String.CASE_INSENSITIVE_ORDER);

    private PaintMapper() {}

    static Paint toDto(PaintEntity entity, Map<UUID, Long> usageCounts) {
        return toDto(entity, usageCounts.getOrDefault(entity.getId(), 0L));
    }

    static Paint toDto(PaintEntity entity, long usageCount) {
        return toDtoWithoutUsage(entity).usageCount(Math.toIntExact(usageCount));
    }

    /**
     * The same representation without a usage count, for the copies embedded in a recipe. Reporting
     * a count there would mean either an extra query per entry or a number that is simply wrong.
     */
    static Paint toDtoWithoutUsage(PaintEntity entity) {
        return new Paint(entity.getName())
                .id(entity.getId())
                .externalId(entity.getExternalId())
                .ownerUserId(entity.getOwnerUserId())
                .basePaintId(entity.getBasePaintId())
                .brand(entity.getBrand())
                .paintType(toDto(entity.getPaintType()))
                .hexColour(entity.getHexColour());
    }

    /** The generated DTO enum shares this one's constant names but not its package. */
    static PaintType toDto(com.keith.battlereadyshelf.paint.PaintType paintType) {
        return paintType == null ? null : PaintType.valueOf(paintType.name());
    }

    static com.keith.battlereadyshelf.paint.PaintType fromDto(PaintType paintType) {
        return paintType == null
                ? null
                : com.keith.battlereadyshelf.paint.PaintType.valueOf(paintType.getValue());
    }

    static String requireName(String name) {
        var trimmed = trimToNull(name);
        if (trimmed == null) {
            throw new BadRequestException("A paint needs a name.");
        }
        return trimmed;
    }

    /**
     * Normalises the swatch to lowercase so two spellings of the same colour compare equal, which
     * is what stops re-proposing an unchanged colour from looking like a change.
     */
    static String normaliseHexColour(String hexColour) {
        var trimmed = trimToNull(hexColour);
        if (trimmed == null) {
            return null;
        }
        if (!HEX_COLOUR.matcher(trimmed).matches()) {
            throw new BadRequestException(
                    "A paint's colour must be a hex value like #B4B4B4, but was '" + hexColour + "'.");
        }
        return trimmed.toLowerCase();
    }

    static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        var trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

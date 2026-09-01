package com.keith.battlereadyshelf.definitionexport;

import com.keith.battlereadyshelf.error.BadRequestException;

/**
 * The versioning rule shared by every portable catalogue document - factions, wargear and model
 * definitions. They are exported and imported separately, one per admin page, but they come from
 * the same source dataset build and so move through schema versions together.
 */
public final class ExportSchema {
    /** The version this application writes. */
    public static final int CURRENT_VERSION = 4;

    /**
     * The oldest version still accepted on import. Version 3 is the last combined catalogue, which
     * carried factions and wargear inline in the model definition document.
     */
    public static final int MINIMUM_SUPPORTED_VERSION = 3;

    private ExportSchema() {}

    /**
     * Rejects a document this application cannot read, naming the kind of document so an admin who
     * has picked the wrong file on the wrong page gets a useful message.
     */
    public static void requireSupported(Integer schemaVersion, String documentKind) {
        if (schemaVersion == null
                || schemaVersion < MINIMUM_SUPPORTED_VERSION
                || schemaVersion > CURRENT_VERSION) {
            throw new BadRequestException(
                    "Unsupported " + documentKind + " export schemaVersion: " + schemaVersion);
        }
    }
}

package com.keith.battlereadyshelf.definitiondraft;

/**
 * Where a pending change came from.
 *
 * <p>Worth recording because the two carry different weight when reviewing: a proposal from the
 * reference dataset is a suggestion that may be re-raised by the next import, whereas one an
 * admin typed reflects a decision already made in the app.
 */
public enum ProposalOrigin {
    /** Raised by importing a reference dataset document. */
    IMPORT,

    /** Typed by an admin in the app. */
    ADMIN
}

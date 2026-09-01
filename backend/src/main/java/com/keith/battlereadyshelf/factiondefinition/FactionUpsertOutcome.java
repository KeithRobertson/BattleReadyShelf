package com.keith.battlereadyshelf.factiondefinition;

import java.util.List;
import java.util.Map;

/**
 * The result of upserting a set of factions, exposing both the resolved entities (so a model
 * definition import can link to them) and what actually changed (so an admin sees a summary).
 *
 * @param bySourceId every faction in the document, keyed by its stable source id
 * @param created factions the catalogue did not have
 * @param updated factions whose name or parent the document changed
 * @param unchanged how many already matched the document
 */
public record FactionUpsertOutcome(
        Map<String, FactionEntity> bySourceId,
        List<FactionEntity> created,
        List<FactionEntity> updated,
        int unchanged) {

    public static FactionUpsertOutcome empty() {
        return new FactionUpsertOutcome(Map.of(), List.of(), List.of(), 0);
    }

    /** The state an import compares against, so a re-import of the same document is a no-op. */
    static String stateOf(FactionEntity faction) {
        return faction.getName()
                + "\u001f"
                + (faction.getParentFactionId() == null ? "" : faction.getParentFactionId());
    }
}

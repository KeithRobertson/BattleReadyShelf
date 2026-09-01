package com.keith.battlereadyshelf.factiondefinition;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The result of upserting a set of factions, exposing both the resolved entities (so a model
 * definition import can link to them) and what happened (so an admin sees a summary).
 *
 * @param bySourceId every faction in the document, keyed by its stable source id
 * @param created factions the catalogue did not have, added outright
 * @param pendingChanges changes staged for review because the stored faction differs
 * @param unchanged how many already matched the document
 */
public record FactionUpsertOutcome(
        Map<String, FactionEntity> bySourceId,
        List<FactionEntity> created,
        List<FactionDraftEntity> pendingChanges,
        int unchanged) {

    public static FactionUpsertOutcome empty() {
        return new FactionUpsertOutcome(Map.of(), List.of(), List.of(), 0);
    }

    /** The state a proposal compares against, so re-proposing the same values is a no-op. */
    static String stateOf(String name, UUID parentFactionId) {
        return name + "\u001f" + (parentFactionId == null ? "" : parentFactionId);
    }

    static String stateOf(FactionEntity faction) {
        return stateOf(faction.getName(), faction.getParentFactionId());
    }
}

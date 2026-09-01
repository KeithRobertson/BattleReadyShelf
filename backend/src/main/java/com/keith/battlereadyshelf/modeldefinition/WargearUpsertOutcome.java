package com.keith.battlereadyshelf.modeldefinition;

import java.util.List;
import java.util.Map;

/**
 * The result of upserting a set of shared wargear, exposing both the resolved entities (so a model
 * definition import can link its usage rows to them) and what changed (so an admin sees a summary).
 *
 * <p>Renames are not applied: one definition backs every model carrying the item, so a differing
 * name lands in {@code pendingChanges} for review instead.
 *
 * @param bySourceId every wargear in the document, keyed by its stable source id
 * @param created wargear the catalogue did not have, added outright
 * @param pendingChanges renames raised for review
 * @param unchanged how many already matched the document
 */
public record WargearUpsertOutcome(
        Map<String, WargearDefinitionEntity> bySourceId,
        List<WargearDefinitionEntity> created,
        List<WargearDefinitionDraftEntity> pendingChanges,
        int unchanged) {

    public static WargearUpsertOutcome empty() {
        return new WargearUpsertOutcome(Map.of(), List.of(), List.of(), 0);
    }
}

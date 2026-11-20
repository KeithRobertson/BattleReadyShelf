# Collection export enhancements: design

Date: 2026-11-20
Status: approved design, awaiting review
Amends: `docs/superpowers/specs/2026-11-20-collection-export-design.md`

## Goal

Adjust the collection export dialog and document so that:

- HTML and Every miniature are the defaults.
- HTML and Markdown can show a status with or without its time, and a shown time can stay raw UTC ISO or be formatted in a chosen IANA timezone.
- From the collection page, an export can contain only the miniatures ticked in Edit mode.

Everything else in the original design still applies. Page filters are still ignored. JSON timestamps stay UTC ISO. The document still contains no ids, and `schemaVersion` stays 1.

## Decisions

| Question | Decision |
|---|---|
| What "selected" means | The Edit-mode checkboxes (`selectedModelIds`). Aside filters are not a scope. |
| Where the limit is applied | The server. The request may name miniature ids; the document lists only those. |
| Who formats times | The browser, and only for HTML and Markdown. No extra library: `Intl.DateTimeFormat` and `Intl.supportedValuesOf("timeZone")`. |
| JSON timestamps | Always the UTC ISO instants already in the document, whenever status or status history is included. |

## Dialog

### Defaults

| Control | New default |
|---|---|
| Format | HTML |
| Detail | Every miniature |
| Include times | Off |
| Timezone | Raw ISO |

JSON still ignores Detail, because a JSON export always lists every miniature. The Detail control stays disabled for JSON.

### Scope

Shown only when the dialog is opened from the collection page and Edit mode has at least one miniature ticked:

- Whole collection
- Only the N selected

It starts on "Only the N selected". With nothing ticked, the control is absent and the export is the whole collection. The Collections list has no miniature ticks, so it never shows this control and never sends miniature ids.

### Include times

A checkbox, default off. It is disabled, with a short hint, unless Status or Status history is on. It does not change the JSON file.

- Status on, times off: the status name only (`Painted`).
- Status history on, times off: each history entry is the status name only.
- Times on: `statusChangedAt` and each history `changedAt` are printed.

### Timezone

A searchable select, enabled only while Include times is on.

1. Raw ISO
2. Local, meaning the zone `Intl.DateTimeFormat().resolvedOptions().timeZone` reports at the moment of export
3. Every id from `Intl.supportedValuesOf("timeZone")`, sorted

The default is Raw ISO. If `supportedValuesOf` is missing, the list is Raw ISO and Local only.

Local is resolved to a concrete zone id before rendering, so the renderers do not read the browser clock themselves.

## Request

`CollectionExportRequest` gains an optional `collectionModelIds` array. No response field changes.

| `collectionModelIds` | Result |
|---|---|
| Omitted | Every miniature, as today. |
| Present, with `armyCollectionIds` length not exactly 1 | 400. Ticks belong to one collection page. |
| Present and empty | 400. The dialog never sends this: with nothing ticked it omits the field. |
| Present, one collection, every id a miniature in that owned collection | Only those miniatures. Duplicate ids are ignored. |
| Any id that is not a miniature in that owned collection | 404 for the whole request. |

A 400 or 404 is reported by the existing interceptor. The dialog stays open and no file is written.

### Filtered document

Counts are rebuilt from the miniatures that remain.

- `modelCount` counts only those miniatures. `statusCounts` does too, and only when Status is included, as in the original design.
- A model type with none left is omitted.
- The collection description stays. When paint recipes are included, the collection-level recipe stays, a type recipe stays only for a type that remains, and a miniature recipe stays only for a miniature that remains.
- Order of the remaining miniatures is unchanged (name, unnamed last, id tie-break).
- The file still has no ids. Thumbnail URLs are requested only for the miniatures that remain.

## Rendering

`renderMarkdown` and `renderHtml` each take the time display as one extra argument: off, raw ISO, or an IANA zone id. "Local" has already been resolved to a zone id.

| Time display | HTML and Markdown |
|---|---|
| Off | No `statusChangedAt`, and no `changedAt` on history entries. Status names still print when their include flag is on. |
| Raw ISO | The document's UTC string, unchanged (`2026-10-02T18:30:00Z`). |
| Zone | `en-GB`, 24-hour, with a short zone name: `2 Oct 2026, 19:30 BST`. |

The formatted pattern is `day: numeric`, `month: short`, `year: numeric`, `hour: 2-digit`, `minute: 2-digit`, `hourCycle: h23`, `timeZoneName: short`. An instant that cannot be parsed is printed raw.

Checked examples for `Europe/London`:

- `2026-01-15T12:00:00Z` → `15 Jan 2026, 12:00 GMT`
- `2026-07-15T11:00:00Z` → `15 Jul 2026, 12:00 BST`

JSON export ignores the time display and saves the document as it arrived.

## Wiring

- `CollectionHeader` passes the current `selectedModelIds` into the modal.
- "Only the N selected" sends those ids as `collectionModelIds`.
- "Whole collection", and every export from the Collections list, omits `collectionModelIds`.
- `useCollectionExport` forwards that field and does not send the time display to the API.

## Testing

Backend (`CollectionExportServiceTest`):

- Only the requested miniatures are present. `modelCount` is rebuilt from them, and so is `statusCounts` when Status is included.
- A model type with none left is omitted. When paint recipes are included, its type recipe is omitted and the collection recipe remains.
- Several collections plus miniature ids → 400.
- An empty miniature id list → 400.
- An id that is not in the owned collection → 404.

Frontend:

- Both renderers omit times when asked, pass an ISO string through, and format the two `Europe/London` examples above.
- An unparseable instant is printed raw.
- The dialog opens on HTML and Every miniature.
- With ticks, the scope control is shown and starts on "Only the N selected", and the request body contains those ids.
- With no ticks, the scope control is absent and the request omits `collectionModelIds`.
- Include times is disabled while both Status and Status history are off.

## Out of scope

- Limiting an export to the aside filters.
- Changing JSON timestamps, or adding a timezone field to the document.
- Raising `schemaVersion`.
- Remembering the last timezone.
- Importing an export.

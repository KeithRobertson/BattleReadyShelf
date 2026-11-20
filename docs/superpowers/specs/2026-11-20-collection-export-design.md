# Collection export: design

Date: 2026-11-20
Status: approved design, awaiting implementation plan

## Goal

Let a user take the contents of one or more of their collections out of the app as a file they can
send or post elsewhere: a machine-readable JSON document, or a human-readable HTML or Markdown
document. The user chooses the format and which content to include.

An export is a one-way snapshot. Loading an export back into the app is not part of this work.

## Decisions

| Question | Decision |
|---|---|
| Purpose | One-way snapshot. The JSON is versioned, but import is separate future work. |
| Who can export | The owner only, for their own collections. |
| Formats | JSON, HTML, Markdown. Markdown can be downloaded or copied to the clipboard. |
| Multiple collections | One combined document, with a section (or array entry) per collection. |
| Scope within a collection | Always the whole collection. Page filters are ignored. |
| Detail level | HTML and Markdown offer "Summary" or "Every miniature". JSON always lists every miniature. |
| Photos | HTML only: each miniature's list thumbnail, embedded in the file. JSON and Markdown are text only. |
| Architecture | The backend builds a versioned export document. The frontend renders HTML and Markdown from it. |
| Schema location | `openapi/collection-export.yaml`, referenced from `openapi.yaml` by `$ref`. |

## User flow

### Entry points

Both are shown to the owner only and open the same dialog.

- **Collections page:** an "Export" button in `CollectionsHeader`, shown when the user is signed in
  and has at least one collection. The dialog starts with a checklist of the user's collections in
  display order, all ticked, with a select-all toggle.
- **Collection page:** an "Export" button in `CollectionHeader` beside Delete. The dialog exports
  that one collection and shows no checklist.

### Dialog

One component, `ExportCollectionsModal`, built on the existing `ResponsiveModal`.

1. **Collections:** the checklist (Collections page only).
2. **Format:** JSON, HTML or Markdown.
3. **Detail:** Summary or Every miniature. Disabled for JSON.
4. **Include:** one checkbox per content option, below.
5. **Actions:** "Download" for every format, and "Copy to clipboard" for Markdown.

| Option | Request flag | Default | Applies when |
|---|---|---|---|
| Collection description | `collectionDescription` | on | always |
| Faction | `faction` | on | always |
| Status | `status` | on | always |
| Wargear | `wargear` | on | always |
| Paint recipes | `paintRecipes` | on | always |
| Miniature names and descriptions | `miniatureDetails` | on | JSON, or Every miniature |
| Spare magnetised bits | `spareBits` | off | Wargear is on |
| Status history | `statusHistory` | off | Status is on, and JSON or Every miniature |
| Thumbnails | `thumbnails` | off | HTML and Every miniature |

An option that does not apply to the current format or detail level is disabled with a short hint.
It is not hidden, so the list does not move as the user changes format. A disabled option is sent as
`false` whatever its checkbox says.

Download and Copy are disabled while no collection is ticked, and while an export is in flight.

The dialog has no preview pane and does not remember the last-used options.

### File names

- One collection: `<collection-name-slug>-<yyyy-mm-dd>.<ext>`
- Several: `collections-<yyyy-mm-dd>.<ext>`

The slug is the collection name lower-cased with runs of non-alphanumeric characters replaced by a
hyphen, falling back to `collection` if nothing is left. The date is the UTC date, matching the
existing admin exports. Extensions and types are `.json` (`application/json`), `.html`
(`text/html`) and `.md` (`text/markdown`).

## API

### Endpoint

`POST /api/v1/army-collections/export`, operation `exportArmyCollections`, tag `CollectionExport`.

- Bearer auth is required. The route is not added to the public permit list in
  `SecurityConfiguration`.
- It is a POST because the body carries the ids and options. It changes nothing.
- The tag is new so that the generated interface is its own `CollectionExportApi`, implemented by a
  new controller, rather than another method on `ArmyCollectionsController`.

### Request: `CollectionExportRequest`

| Field | Type | Notes |
|---|---|---|
| `armyCollectionIds` | uuid[] | Required, at least one. Duplicates are ignored. |
| `include` | `CollectionExportInclude` | Nine booleans, named in the table above. An omitted flag is `false`. |

The server normalises two dependent flags: `spareBits` is treated as `false` unless `wargear` is
`true`, and `statusHistory` as `false` unless `status` is `true`.

### Responses

- `200`: a `CollectionExport`.
- `400`: `armyCollectionIds` is empty.
- `404`: any id is not a collection owned by the caller. The whole request fails; there is no
  partial export. Ownership is checked with the existing `requireOwnedArmyCollection`, so the answer
  is the same one the app already gives for someone else's collection.

### Ordering

The response order does not depend on the order ids were sent in.

- **Collections:** the user's display order.
- **Model types:** the collection's group order: the ids in `modelDefinitionOrder` first, then the
  remaining types alphabetically. This matches the Collection page.
- **Miniatures within a type:** by name, case-insensitively, unnamed last, with ties broken by id so
  the output is stable. This matches the Collection page's default sort.

## Export document

### Shape

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-11-20T11:04:00Z",
  "ownerDisplayName": "Keith",
  "included": {
    "collectionDescription": true,
    "faction": true,
    "status": true,
    "statusHistory": true,
    "wargear": true,
    "spareBits": true,
    "paintRecipes": true,
    "miniatureDetails": true,
    "thumbnails": false
  },
  "collections": [{
    "name": "Death Guard",
    "description": "...",
    "modelCount": 42,
    "statusCounts": { "PAINTED": 30, "PRIMED": 12 },
    "paintRecipe": {
      "notes": "...",
      "paints": [{
        "name": "Death Guard Green",
        "brand": "Citadel",
        "paintType": "BASE",
        "hexColour": "#848A66",
        "step": "Base",
        "note": "thinned 2:1"
      }]
    },
    "modelTypes": [{
      "name": "Plague Marine",
      "faction": "Death Guard",
      "modelCount": 12,
      "statusCounts": { "PAINTED": 12 },
      "paintRecipe": null,
      "miniatures": [{
        "name": "Champion",
        "description": "...",
        "status": "PAINTED",
        "statusChangedAt": "2026-10-02T18:30:00Z",
        "statusHistory": [{ "status": "PAINTED", "changedAt": "2026-10-02T18:30:00Z" }],
        "loadout": [{
          "slots": ["Right hand", "Left hand"],
          "wargear": "Plague spewer",
          "custom": false,
          "spares": ["Blight launcher"]
        }],
        "paintRecipe": null,
        "thumbnailUrl": null
      }]
    }]
  }]
}
```

### Rules

- **`included` says what was exported.** It echoes the include flags after the server's
  normalisation. A consumer reads `included.wargear` to tell an empty `loadout` that means "no
  wargear" from one that means "not exported". Null and absent mean the same thing everywhere in the
  document, and nothing relies on the difference. This is deliberate: the generated Java DTOs
  serialise an unset field as `null` and an unset list as `[]`, so they cannot express "absent".
- **`name` and `modelCount` are always present** on collections and model types.
- **Each include flag governs these fields:**

| Flag | Fields |
|---|---|
| `collectionDescription` | collection `description` |
| `faction` | model type `faction` |
| `status` | `statusCounts` on collections and model types; miniature `status` and `statusChangedAt` |
| `statusHistory` | miniature `statusHistory`, newest first |
| `wargear` | miniature `loadout` |
| `spareBits` | `spares` on loadout entries, and entries for slots that hold only spares |
| `paintRecipes` | `paintRecipe` on collections (COLLECTION scope), model types (MODEL_TYPE) and miniatures (MODEL) |
| `miniatureDetails` | miniature `name` and `description` |
| `thumbnails` | miniature `thumbnailUrl` |

- **`statusCounts`** maps a `CollectionModelStatus` name to a count. Statuses with no miniatures are
  omitted.
- **`loadout` has one entry per physical item.**
  - Slots sharing a `linkGroupId` collapse to one entry whose `slots` names every slot it occupies.
  - `wargear` is the wargear option's name, or the custom label with `custom: true`.
  - On a magnetised slot, `wargear` is the equipped bit and `spares` lists the other owned bits.
  - A slot with spares but nothing equipped appears with `wargear: null`, when `spareBits` is on.
  - An empty slot with no spares is left out.
- **`paintRecipe`** carries the recipe's `notes` and its `paints` in recipe order. Each paint has
  `name`, `brand`, `paintType` (the existing `PaintType` enum), `hexColour`, `step` (the recipe
  entry's step label) and `note`.
  `showOnCard` is an app display setting and is not exported.
- **`thumbnailUrl`** is a presigned URL valid for 15 minutes (`DOWNLOAD_URL_TTL`). It points at the
  thumbnail rendition of the photo the collection list shows: the image flagged `listThumbnail`, or
  else the first image. The dialog requests it only for HTML, so a downloaded JSON file never
  contains an expiring link.
- **No internal UUIDs** appear anywhere in the document. Adding ids later would not be a breaking
  change.
- **Alternate identities are not exported.**
- **`schemaVersion` starts at 1** and is its own version line, separate from the catalogue
  `ExportSchema`, because the two kinds of document change independently. It is incremented on a
  breaking change.

### Where the schema lives

The path and operation are declared in `openapi.yaml`. The schemas (`CollectionExportRequest`,
`CollectionExportInclude`, `CollectionExport` and the types nested under it, all prefixed
`CollectionExport`) are declared in a new `openapi/collection-export.yaml` beside it and referenced
by relative `$ref`.

This is the first external reference in the spec, so it is unproven with the two generators in use
(openapi-generator 6.6.0 for Spring, `@hey-api/openapi-ts` 0.99.0 for the frontend). The first step
of the implementation is to prove that both generate correct types from it. If either cannot, the
schemas are declared inline in `openapi.yaml` as one contiguous block instead; nothing else in this
design changes.

No standalone JSON Schema mirror (like `schema/faction-export.schema.json`) is added.

## Backend

A new package, `com.keith.battlereadyshelf.collectionexport`:

- **`CollectionExportController`** implements the generated `CollectionExportApi`.
- **`CollectionExportService`** checks ownership, loads the data and assembles the document. It
  reads through the existing repositories in bulk, per collection rather than per miniature, inside
  a read-only transaction.
- **`LoadoutExportMapper`** turns one miniature's wargear selections, magnetised slots and
  definition slots into loadout entries. It is a pure function of its inputs so it can be unit
  tested alone. It is the backend counterpart of the frontend's `loadoutDisplayItems.ts`, which
  holds the same "linked slots are one item" rule for display.
- **`CollectionExportSchema`** holds `CURRENT_VERSION = 1`.

No migration is needed.

## Frontend

### Units

| Unit | Location | Purpose |
|---|---|---|
| `ExportCollectionsModal` | `src/components/collections/export/` | The dialog. |
| `useCollectionExport` | `src/hooks/collections/` | Runs an export: request, thumbnails, render, download or copy. |
| `exportOptions` | `src/utils/collectionExport/` | Pure rules: which options apply for a format and detail level, and the include flags to send. |
| `summariseModelType` | `src/utils/collectionExport/` | Groups a model type's miniatures by identical loadout, with a count each. |
| `renderMarkdown` | `src/utils/collectionExport/` | `(doc, detail) => string` |
| `renderHtml` | `src/utils/collectionExport/` | `(doc, detail, thumbnails) => string` |
| `inlineThumbnails` | `src/utils/collectionExport/` | Fetches thumbnail URLs and returns data URIs plus a failure count. |
| `exportFileName` | `src/utils/collectionExport/` | Builds the file name. |
| `downloadFile` | `src/utils/` | Saves a string as a file. Extracted from `DefinitionTransferButtons`, which then uses it too. |

All types come from the generated client. The generated `exportArmyCollections` call passes
`throwOnError: true`.

### Rendering

- **JSON** is the response document, pretty-printed, saved as it arrived.
- **Renderers take no include options.** They read `included` and render what the document says was
  exported. Detail level is their only setting.
- **Summary** shows, per model type: name, faction, count, status breakdown, and each distinct
  loadout with how many miniatures carry it (for example "12x boltgun, plague knife"). Two
  miniatures share a loadout when their loadout entries, including spares if exported, are equal. It
  shows collection-level and type-level paint recipes. It leaves out everything that belongs to a
  single miniature: name, description, status history, thumbnail and its own paint recipe.
- **Every miniature** shows one entry per miniature under its model type, with every exported field.
  A miniature without a name is labelled by its position within the type.
- **Markdown** uses headings and bullet lists only. It uses no tables, because Discord does not
  render them.
- **HTML** is one self-contained file: inline styles, no scripts, no external resources. It is a
  plain, print-friendly document with fixed light styling rather than the app theme. In Every
  miniature mode each miniature is a row with its thumbnail on the left. Paints show a colour swatch
  when they have a `hexColour`.
- **Both readable formats** end with a line saying the document was exported from BattleReadyShelf
  and when.

### Escaping

The files are meant to be opened by other people, so all user-entered text (names, descriptions,
notes, step labels, custom labels) is treated as untrusted.

- HTML: text is HTML-escaped. A `hexColour` is written into a style only if it matches
  `^#[0-9A-Fa-f]{6}$`.
- Markdown: Markdown control characters are escaped, and line breaks are collapsed where the text
  sits on a single line such as a heading or list item.

### Thumbnails

- After the document arrives, `inlineThumbnails` fetches each `thumbnailUrl` with `fetch`, six at a
  time, and converts each response to a data URI using its content type.
- The Download button shows progress while this runs ("Embedding photos 40/120").
- `renderHtml` receives the data URIs keyed by URL. A miniature whose thumbnail is missing renders
  without a photo.

## Prerequisites and risks

- **R2 CORS.** The bucket's CORS policy must allow `GET` from the app's origins, local and
  production. Today the browser only `fetch`es R2 to upload; photos are shown through `<img>`,
  which needs no CORS. This is a bucket setting in Cloudflare, not code. It must be checked by hand
  before the thumbnail work starts. Without it, HTML exports work but contain no photos.
- **External `$ref`.** Covered above, with its fallback.
- **HTML file size.** Every embedded photo adds its own size plus about a third for the encoding.
  Real thumbnail sizes have not been measured. The plan should export a large collection with
  thumbnails and confirm the file is a reasonable size to share.

## Error handling

- **The export call fails,** including a 404 because a collection was deleted elsewhere: the central
  interceptor reports it once. The dialog stays open with its choices intact, the buttons re-enable
  and no file is produced. The dialog adds no alert of its own.
- **Failures the API layer cannot see** report themselves with `showErrorNotification`, guarded by
  `!isAxiosError(e)`: the file could not be saved, or the browser refused the clipboard write.
- **Thumbnails that fail to fetch do not fail the export.** The file is still produced and one
  notification says how many photos were left out ("12 of 120 photos could not be embedded"). If
  every photo fails, the message says the export contains no photos.
- **A collection with no miniatures** exports normally and says it is empty.

## Testing

### Backend (JUnit, AssertJ, Mockito)

- `LoadoutExportMapper`: linked slots collapse to one entry; custom labels; equipped bit and spares
  on a magnetised slot; a slot with only spares; empty slots dropped; spares absent when not
  requested.
- `CollectionExportService`: each include flag governs its fields; `included` echoes the normalised
  request; ordering of collections, model types and miniatures; paint recipes land at the right
  scope; `thumbnailUrl` appears only when requested and picks the list thumbnail.
- Ownership and security: one id the caller does not own gives a 404 for the whole request; an empty
  id list gives a 400; no token gives a 401.

### Frontend (Vitest, React Testing Library, `stubApi`)

- `exportOptions`: which options apply for each format and detail level, and the flags sent.
- `summariseModelType`: identical loadouts collapse, different ones stay apart, order is stable.
- `renderMarkdown` and `renderHtml`, at both detail levels: content not `included` is not rendered;
  hostile text (`<script>`, Markdown syntax, a malformed `hexColour`) comes out harmless; the HTML
  references no external resource.
- `inlineThumbnails`: a partial failure returns the successes and the failure count.
- `exportFileName`: one collection, several, and a name with nothing usable in it.
- `ExportCollectionsModal`: options enable and disable with format and detail; the request carries
  the right ids and flags; an API failure leaves the dialog open and downloads nothing; the copy
  path writes Markdown to the clipboard.

### Screenshot scenarios (Playwright harness)

- The dialog in its default state.
- The dialog with `failApi` on the export call.

## Out of scope

- Importing an export.
- Export by anyone other than the owner, including viewers of a public collection.
- Photos in JSON or Markdown, and any photo other than the list thumbnail.
- Exporting only the miniatures the page filters currently show.
- Alternate identities.
- A plain-text format.
- A preview pane, and remembering the last-used options.
- A standalone JSON Schema mirror of the document.

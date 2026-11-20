# Collection Export Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Default collection export to HTML and Every miniature, let HTML/Markdown show status with or without a chosen timezone, and let a collection-page export contain only the ticked miniatures.

**Architecture:** `CollectionExportRequest` gains optional `collectionModelIds`. The server drops every other miniature and rebuilds counts before returning the same document shape (`schemaVersion` stays 1). Time display is not sent to the API. `renderMarkdown` and `renderHtml` take a time-display argument and format instants with `Intl.DateTimeFormat` (`en-GB`).

**Tech Stack:** Spring Boot 4 / Java 26, OpenAPI-generated DTOs, React + TypeScript + Mantine, Vitest, JUnit + AssertJ + Mockito.

**Spec:** `docs/superpowers/specs/2026-11-20-collection-export-enhancements-design.md`

## Global Constraints

- Do this work on a new branch `feature/collection-export-enhancements` off current `main`. Do not commit on `main`.
- `schemaVersion` stays 1. The response document gains no id fields.
- Page filters are still ignored. Only Edit-mode `selectedModelIds` can limit an export.
- JSON timestamps stay the document's UTC ISO strings. Time display applies only to HTML and Markdown.
- No new library. Use `Intl.DateTimeFormat` and `Intl.supportedValuesOf("timeZone")`.
- Generated SDK calls use `throwOnError: true`. API failures stay on the interceptor. The dialog adds no alert of its own and stays open on failure.
- Regenerate clients after the OpenAPI change. Do not hand-write the new request field.
- Commits are authorised for this plan. On PowerShell use `git commit -m @"..."@`.

---

### Task 1: Optional miniature ids on the request

**Files:**
- Modify: `backend/src/main/resources/openapi/collection-export.yaml` (`CollectionExportRequest`)
- Regenerates: backend `build/generated`, frontend `src/generated` (gitignored; CI runs `openapi-ts`)

**Interfaces:**
- Produces: `CollectionExportRequest.collectionModelIds: List<UUID>` optional. Omitted means no filter.

- [ ] **Step 0: Branch**

```powershell
git checkout -b feature/collection-export-enhancements
```

- [ ] **Step 1: Add the property**

Inside `CollectionExportRequest.properties`, after `include`:

```yaml
        collectionModelIds:
          type: array
          description: >-
            When set, the single requested collection is limited to these miniatures.
            Duplicates are ignored. Omit the field to export every miniature.
            An empty array is rejected. Combining this field with more than one
            armyCollectionId is rejected.
          items:
            type: string
            format: uuid
```

Do not add it to `required`.

- [ ] **Step 2: Regenerate**

```powershell
cd backend; .\gradlew.bat openApiGenerate
cd frontend; npm run openapi-ts
```

Expected: both succeed, and `CollectionExportRequest` has `getCollectionModelIds()` / `collectionModelIds?: string[]`.

- [ ] **Step 3: Commit**

```powershell
git add backend/src/main/resources/openapi/collection-export.yaml
git commit -m @"
Allow a collection export to name miniature ids

"@
```

Do not commit `backend/build` or `frontend/src/generated`.

---

### Task 2: Filter miniatures in CollectionExportService

**Files:**
- Modify: `backend/src/main/java/com/keith/battlereadyshelf/collectionexport/CollectionExportService.java`
- Test: `backend/src/test/java/com/keith/battlereadyshelf/collectionexport/CollectionExportServiceTest.java`

**Interfaces:**
- Consumes: `request.getCollectionModelIds()`
- Produces: `exportCollection(collection, include, miniatureIdsOrNull)` where null means all models

- [ ] **Step 1: Write failing tests**

Add cases to `CollectionExportServiceTest`:

1. Two owned collection ids plus a non-empty `collectionModelIds` throws `BadRequestException`.
2. One collection and an empty `collectionModelIds` list throws `BadRequestException`.
3. One collection and an id that is not among its models throws `NotFoundException`. Nothing is assembled past the check.
4. One collection, two miniatures, request names one: the document contains that miniature only, `modelCount` is 1, and a model type that lost all of its miniatures is absent. When status is included, `statusCounts` match the remaining miniature. When paint recipes are included, the collection recipe remains and the dropped type's recipe does not.
5. Duplicate ids for the same miniature export that miniature once.

Follow the existing Mockito fixture style in that test class. Call `export` with a `CollectionExportRequest` whose `collectionModelIds` is set.

- [ ] **Step 2: Run the new tests and confirm they fail**

```powershell
cd backend; .\gradlew.bat test --tests com.keith.battlereadyshelf.collectionexport.CollectionExportServiceTest
```

Expected: FAIL on the new cases (filter not implemented).

- [ ] **Step 3: Implement the filter**

In `export`, before the collection loop:

- Let `miniatureIds = request.getCollectionModelIds()`.
- Null means no filter.
- Empty throws `BadRequestException` ("collectionModelIds must not be empty").
- Non-null and `distinctIds.size() != 1` throws `BadRequestException` ("collectionModelIds requires exactly one collection").
- Otherwise `Set<UUID> allowed = new LinkedHashSet<>(miniatureIds)`.

Pass `allowed` (or null) into `exportCollection`. After `findAllByArmyCollectionId`:

- If `allowed` is non-null, any id in `allowed` that is not in the loaded model ids throws `NotFoundException` ("Collection model not found: " + id).
- Then keep only models whose id is in `allowed`.

Existing grouping, ordering, count, and recipe code then runs on that shorter list. Do not add ids to the DTOs.

- [ ] **Step 4: Re-run the test class**

Same command. Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/main/java/com/keith/battlereadyshelf/collectionexport/CollectionExportService.java backend/src/test/java/com/keith/battlereadyshelf/collectionexport/CollectionExportServiceTest.java
git commit -m @"
Limit a collection export to the requested miniatures

"@
```

---

### Task 3: Format or hide times in the readable renderers

**Files:**
- Create: `frontend/src/utils/collectionExport/formatExportTime.ts`
- Create: `frontend/src/utils/collectionExport/formatExportTime.test.ts`
- Modify: `frontend/src/utils/collectionExport/renderMarkdown.ts`
- Modify: `frontend/src/utils/collectionExport/renderHtml.ts`
- Modify: their tests and `renderShared.ts` if status lines are built there

**Interfaces:**
- Produces:

```typescript
export type TimeDisplay = { kind: "off" } | { kind: "iso" } | { kind: "zone"; timeZone: string };

export function formatExportTime(iso: string, display: TimeDisplay): string | null
```

`off` returns null. `iso` returns the input string. `zone` formats with:

```typescript
new Intl.DateTimeFormat("en-GB", {
  timeZone: display.timeZone,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
}).format(new Date(iso))
```

If `new Date(iso)` is invalid, return the raw string. Normalise the `Intl` result so the tests match the spec exactly: turn a narrow no-break space into a normal space, and drop a single " at " between the date and the time. The expected strings are `15 Jan 2026, 12:00 GMT` and `15 Jul 2026, 12:00 BST`.

- Consumed by renderers:

```typescript
renderMarkdown(doc, detail, time: TimeDisplay)
renderHtml(doc, detail, thumbnails, time: TimeDisplay)
```

- [ ] **Step 1: Write failing formatter tests**

`formatExportTime.test.ts`:

- `{ kind: "off" }` → `null` for `2026-10-02T18:30:00Z`
- `{ kind: "iso" }` → that same string
- `{ kind: "zone", timeZone: "Europe/London" }` and `2026-01-15T12:00:00Z` → `15 Jan 2026, 12:00 GMT`
- same zone and `2026-07-15T11:00:00Z` → `15 Jul 2026, 12:00 BST`
- `{ kind: "zone", timeZone: "Europe/London" }` and `"not-a-time"` → `"not-a-time"`

Update one existing renderer test so a status line with times off has no ISO timestamp, and one so a London zone prints `GMT` or `BST` as above. Pass `{ kind: "iso" }` from tests that currently expect the raw timestamp, so those expectations stay valid.

- [ ] **Step 2: Run and confirm failure**

```powershell
cd frontend; npm test -- src/utils/collectionExport/formatExportTime.test.ts src/utils/collectionExport/renderMarkdown.test.ts src/utils/collectionExport/renderHtml.test.ts
```

Expected: FAIL (missing module or missing argument).

- [ ] **Step 3: Implement**

`formatExportTime.ts` as above.

In both renderers, thread `time` into the status and status-history writers. Print a parenthetical or ` · ` time only when `formatExportTime` returns non-null. Escape the formatted text the same way neighbouring user-visible text is escaped.

- [ ] **Step 4: Re-run those tests**

Expected: PASS. Then `npm test -- src/utils/collectionExport` and `npm run lint`.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/utils/collectionExport
git commit -m @"
Format or hide status times in collection exports

"@
```

---

### Task 4: Dialog defaults, time controls, and selected-miniature scope

**Files:**
- Modify: `frontend/src/utils/collectionExport/timeZones.ts` (new) plus test
- Modify: `frontend/src/hooks/collections/useCollectionExport.ts` and its test
- Modify: `frontend/src/components/collections/export/ExportCollectionsModal.tsx` and its test
- Modify: `frontend/src/components/collection/CollectionHeader.tsx`

**Interfaces:**
- `listTimeZoneOptions(): { value: string; label: string }[]` — first `iso` / "Raw ISO", then `local` / "Local", then each `Intl.supportedValuesOf("timeZone")` sorted. If `supportedValuesOf` is missing, only the first two.
- `resolveTimeDisplay(includeTimes: boolean, zoneChoice: string): TimeDisplay` — off when `includeTimes` is false; `{ kind: "iso" }` for `"iso"`; `{ kind: "zone", timeZone }` for a zone id; for `"local"`, `timeZone` is `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `ExportCollectionsArgs` gains `time: TimeDisplay` and optional `collectionModelIds?: string[]`.
- The hook puts `collectionModelIds` on the request body only when the array is non-empty. It passes `time` into `renderMarkdown` / `renderHtml` and ignores `time` for JSON.
- Modal props gain `selectedMiniatureIds?: string[]`.

- [ ] **Step 1: Write failing modal and hook tests**

Modal, using the existing Mantine + stubApi harness:

1. On open, the HTML radio is selected and "Every miniature" is selected.
2. "Include times" is unchecked and disabled while Status and Status history are both off. Turning Status on enables it.
3. With `selectedMiniatureIds={["m1"]}`, a radio "Only the 1 selected" is checked by default, and Download sends `collectionModelIds: ["m1"]` (assert via `stubApi` request log).
4. With `selectedMiniatureIds` omitted or empty, that radio is absent and the body has no `collectionModelIds`.
5. Choosing "Whole collection" while ticks exist omits `collectionModelIds`.

Hook: a markdown export with `{ kind: "zone", timeZone: "Europe/London" }` does not put a timezone on the POST body, and the downloaded string contains the formatted London time rather than the raw `Z` instant. A JSON export with the same `time` still contains the raw instant.

- [ ] **Step 2: Run and confirm failure**

```powershell
cd frontend; npm test -- src/components/collections/export src/hooks/collections/useCollectionExport.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the controls**

`ExportCollectionsModal` initial and open-reset state:

- `format` = `"html"`
- `detail` = `"every"`
- `includeTimes` = false
- `zoneChoice` = `"iso"`
- `scope` = `"selected"` when `selectedMiniatureIds` has length, otherwise there is no scope control

Include times checkbox sits with the other includes. Timezone is a Mantine `Select` with `searchable`, data from `listTimeZoneOptions()`, disabled when times are off or the times checkbox is disabled.

`CollectionHeader`: `const { collection, selection } = useCollectionContext()` and pass `selectedMiniatureIds={[...selection.selectedModelIds]}`. Keep the array in the same open-reset pattern already used for `initialSelectedIds` (reset only when the dialog opens, not on every render identity change).

`useCollectionExport.buildContents` passes `args.time`. JSON branch unchanged.

- [ ] **Step 4: Verify**

```powershell
cd frontend; npm test -- src/utils/collectionExport src/hooks/collections/useCollectionExport.test.ts src/components/collections/export
cd frontend; npm run lint
```

Expected: all pass, lint clean.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/utils/collectionExport frontend/src/hooks/collections/useCollectionExport.ts frontend/src/hooks/collections/useCollectionExport.test.ts frontend/src/components/collections/export frontend/src/components/collection/CollectionHeader.tsx
git commit -m @"
Default collection export to HTML and support a selected subset

"@
```

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| HTML and Every miniature defaults | 4 |
| Include times default off; disabled unless status or history | 4 |
| Timezone list: Raw ISO, Local, full IANA; fallback without `supportedValuesOf` | 4 |
| Local resolved before render | 4 |
| `en-GB` format and the two London examples | 3 |
| Unparseable instant printed raw | 3 |
| JSON ignores time display | 3, 4 |
| `collectionModelIds` optional; empty and multi-collection are 400 | 1, 2 |
| Unknown miniature id is 404 for the whole request | 2 |
| Duplicates ignored; counts rebuilt; empty type dropped; recipes follow include flags | 2 |
| No new ids in the document; schemaVersion stays 1 | 1, 2 |
| Collections list never sends miniature ids | 4 |
| Dialog stays open on API failure | already true; do not regress |
| Aside filters ignored | no change |

## Out of scope

Do not add a timezone to the JSON document, do not raise `schemaVersion`, and do not filter by aside filters.

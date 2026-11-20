# Collection Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a collection owner export one or more of their collections as a versioned JSON document, or as human-readable HTML / Markdown with selectable content.

**Architecture:** `POST /api/v1/army-collections/export` builds a purpose-made `CollectionExport` document (names resolved, no internal UUIDs). The frontend renders Markdown and HTML from that document, inlines HTML thumbnails via browser `fetch` of the short-lived presigned URLs, and downloads or copies the result. Schemas live in `openapi/collection-export.yaml` and are referenced from `openapi.yaml`.

**Tech Stack:** Spring Boot 4 / Java 26, OpenAPI-generated DTOs, React + TypeScript + Mantine, Vitest, JUnit + AssertJ + Mockito.

**Spec:** `docs/superpowers/specs/2026-11-20-collection-export-design.md`

## Global Constraints

- Owner-only export; never add this route to the public GET permit list.
- Generated SDK calls use `throwOnError: true`.
- API failures are reported once by the interceptor; the dialog adds no page-level alert.
- Non-API failures use `showErrorNotification` guarded by `!isAxiosError(e)`.
- Do not hand-write OpenAPI types; regenerate after schema changes.
- No migration; no image bytes through the backend.
- Agents must not commit unless the user has authorised commits for this plan; otherwise stop after each task's verify step and ask.

## File Structure

| Path | Responsibility |
|---|---|
| `backend/src/main/resources/openapi/collection-export.yaml` | All `CollectionExport*` schemas |
| `backend/src/main/resources/openapi/openapi.yaml` | Path + `$ref` into the sidecar file |
| `backend/.../collectionexport/CollectionExportSchema.java` | `CURRENT_VERSION = 1` |
| `backend/.../collectionexport/LoadoutExportMapper.java` | Pure loadout collapsing |
| `backend/.../collectionexport/CollectionExportService.java` | Assemble the document |
| `backend/.../collectionexport/CollectionExportController.java` | Implements generated API |
| `frontend/src/utils/downloadFile.ts` | Shared blob download |
| `frontend/src/utils/collectionExport/*.ts` | Options, filename, summarise, renderers, thumbnails |
| `frontend/src/hooks/collections/useCollectionExport.ts` | Orchestration |
| `frontend/src/components/collections/export/ExportCollectionsModal.tsx` | Dialog |
| `frontend/src/components/collections/CollectionsHeader.tsx` | Export entry |
| `frontend/src/components/collection/CollectionHeader.tsx` | Export entry |
| `frontend/scripts/scenarios.mjs` | Screenshot scenarios |

---

### Task 1: OpenAPI contract and codegen proof

**Files:**
- Create: `backend/src/main/resources/openapi/collection-export.yaml`
- Modify: `backend/src/main/resources/openapi/openapi.yaml` (path + components `$ref`s)
- Regenerates: backend `build/generated/...`, frontend `src/generated/`

**Interfaces:**
- Produces: generated types `CollectionExportRequest`, `CollectionExportInclude`, `CollectionExport`, `CollectionExportCollection`, `CollectionExportModelType`, `CollectionExportMiniature`, `CollectionExportLoadoutEntry`, `CollectionExportPaintRecipe`, `CollectionExportPaint`, `CollectionExportStatusEvent`, and `exportArmyCollections` / `CollectionExportApi`

- [ ] **Step 1: Create the sidecar schema file**

Create `backend/src/main/resources/openapi/collection-export.yaml` with every `CollectionExport*` schema. Keep paint `paintType` as a string enum matching `PaintType` values rather than `$ref`-ing back into `openapi.yaml` (avoids a circular external ref):

```yaml
components:
  schemas:
    CollectionExportInclude:
      type: object
      description: >-
        Which content an export includes. Omitted flags are false. The response echoes the
        normalised values in CollectionExport.included.
      properties:
        collectionDescription:
          type: boolean
          default: false
        faction:
          type: boolean
          default: false
        status:
          type: boolean
          default: false
        statusHistory:
          type: boolean
          default: false
        wargear:
          type: boolean
          default: false
        spareBits:
          type: boolean
          default: false
        paintRecipes:
          type: boolean
          default: false
        miniatureDetails:
          type: boolean
          default: false
        thumbnails:
          type: boolean
          default: false
    CollectionExportRequest:
      type: object
      properties:
        armyCollectionIds:
          type: array
          minItems: 1
          items:
            type: string
            format: uuid
          description: Collections to export. Duplicates are ignored. Order is ignored; display order wins.
        include:
          $ref: '#/components/schemas/CollectionExportInclude'
      required: [ armyCollectionIds, include ]
    CollectionExport:
      type: object
      description: A one-way snapshot of one or more army collections. Not designed for import.
      properties:
        schemaVersion:
          type: integer
          format: int32
        exportedAt:
          type: string
          format: date-time
        ownerDisplayName:
          type: string
          nullable: true
        included:
          $ref: '#/components/schemas/CollectionExportInclude'
        collections:
          type: array
          items:
            $ref: '#/components/schemas/CollectionExportCollection'
      required: [ schemaVersion, exportedAt, included, collections ]
    CollectionExportCollection:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
          nullable: true
        modelCount:
          type: integer
          format: int32
        statusCounts:
          type: object
          additionalProperties:
            type: integer
            format: int32
          description: Status name to count. Statuses with none are omitted.
        paintRecipe:
          nullable: true
          allOf:
            - $ref: '#/components/schemas/CollectionExportPaintRecipe'
        modelTypes:
          type: array
          items:
            $ref: '#/components/schemas/CollectionExportModelType'
      required: [ name, modelCount, modelTypes ]
    CollectionExportModelType:
      type: object
      properties:
        name:
          type: string
        faction:
          type: string
          nullable: true
        modelCount:
          type: integer
          format: int32
        statusCounts:
          type: object
          additionalProperties:
            type: integer
            format: int32
        paintRecipe:
          nullable: true
          allOf:
            - $ref: '#/components/schemas/CollectionExportPaintRecipe'
        miniatures:
          type: array
          items:
            $ref: '#/components/schemas/CollectionExportMiniature'
      required: [ name, modelCount, miniatures ]
    CollectionExportMiniature:
      type: object
      properties:
        name:
          type: string
          nullable: true
        description:
          type: string
          nullable: true
        status:
          type: string
          nullable: true
          description: A CollectionModelStatus name when status is included.
        statusChangedAt:
          type: string
          format: date-time
          nullable: true
        statusHistory:
          type: array
          items:
            $ref: '#/components/schemas/CollectionExportStatusEvent'
        loadout:
          type: array
          items:
            $ref: '#/components/schemas/CollectionExportLoadoutEntry'
        paintRecipe:
          nullable: true
          allOf:
            - $ref: '#/components/schemas/CollectionExportPaintRecipe'
        thumbnailUrl:
          type: string
          format: uri
          nullable: true
    CollectionExportLoadoutEntry:
      type: object
      properties:
        slots:
          type: array
          items:
            type: string
          description: Slot names this physical item occupies.
        wargear:
          type: string
          nullable: true
          description: Equipped bit name, or null when the slot holds only spares.
        custom:
          type: boolean
          description: True when wargear is a custom label rather than a catalogue option.
        spares:
          type: array
          items:
            type: string
          description: Owned but unequipped bits on magnetised slots. Absent when spareBits is off.
      required: [ slots, custom ]
    CollectionExportStatusEvent:
      type: object
      properties:
        status:
          type: string
        changedAt:
          type: string
          format: date-time
      required: [ status, changedAt ]
    CollectionExportPaintRecipe:
      type: object
      properties:
        notes:
          type: string
          nullable: true
        paints:
          type: array
          items:
            $ref: '#/components/schemas/CollectionExportPaint'
      required: [ paints ]
    CollectionExportPaint:
      type: object
      properties:
        name:
          type: string
        brand:
          type: string
          nullable: true
        paintType:
          type: string
          enum: [ BASE, LAYER, SHADE, CONTRAST, DRY, TECHNICAL, PRIMER, VARNISH, OTHER ]
          nullable: true
        hexColour:
          type: string
          nullable: true
          pattern: '^#[0-9A-Fa-f]{6}$'
        step:
          type: string
          nullable: true
        note:
          type: string
          nullable: true
      required: [ name ]
```

- [ ] **Step 2: Add the path and component refs to `openapi.yaml`**

Insert after the `/api/v1/army-collections/order` block (before `/{armyCollectionId}`):

```yaml
  /api/v1/army-collections/export:
    post:
      tags: [ "CollectionExport" ]
      summary: Export one or more of the caller's army collections as a versioned snapshot
      description: >-
        Builds a one-way CollectionExport document. Every id must belong to the caller; otherwise
        the whole request is a 404. Collections come back in the caller's display order. Excluded
        content is still present as null/empty in the generated JSON; read `included` to tell
        "not exported" from "none".
      operationId: exportArmyCollections
      security:
        - bearerAuth: [ ]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: 'collection-export.yaml#/components/schemas/CollectionExportRequest'
      responses:
        '200':
          description: The export document
          content:
            application/json:
              schema:
                $ref: 'collection-export.yaml#/components/schemas/CollectionExport'
        '400':
          description: armyCollectionIds was empty
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
        '404':
          description: One or more collections were not found for this user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
```

Also add under `components.schemas` (near the other export schemas) aliases so docs tools that only scan the main file still see the names, **or** rely solely on the path `$ref`s — prefer path `$ref`s only; do not duplicate the full schemas inline.

- [ ] **Step 3: Prove backend generation**

Run:

```powershell
cd backend; .\gradlew.bat openApiGenerate
```

Expected: BUILD SUCCESSFUL, and `build/generated/.../model/CollectionExport.java` plus `.../api/CollectionExportApi.java` exist.

If generation fails on the external `$ref`, stop, move every schema from the sidecar into `openapi.yaml` under `components.schemas` (keep the same names), change the path `$ref`s to `#/components/schemas/...`, delete or empty the sidecar, and re-run until green. Note the outcome in the PR/commit message.

- [ ] **Step 4: Prove frontend generation**

Run:

```powershell
cd frontend; npm run openapi-ts
```

Expected: exit 0, and `src/generated/` contains `exportArmyCollections` and the `CollectionExport*` types.

- [ ] **Step 5: Commit (if authorised)**

```powershell
git add backend/src/main/resources/openapi/collection-export.yaml backend/src/main/resources/openapi/openapi.yaml
git commit -m "$(cat <<'EOF'
Add OpenAPI contract for collection export

EOF
)"
```

Do not commit `src/generated/` or `build/` unless the repo already tracks generated frontend output (it does under `frontend/src/generated/` — include those files if they changed).

---

### Task 2: LoadoutExportMapper

**Files:**
- Create: `backend/src/main/java/com/keith/battlereadyshelf/collectionexport/LoadoutExportMapper.java`
- Test: `backend/src/test/java/com/keith/battlereadyshelf/collectionexport/LoadoutExportMapperTest.java`

**Interfaces:**
- Consumes: plain records of slot / selection / option name (no JPA entities in the mapper signature)
- Produces: `LoadoutExportMapper.map(...) -> List<CollectionExportLoadoutEntry>`

- [ ] **Step 1: Write the failing tests**

Create `LoadoutExportMapperTest.java` modelled on `DefaultLoadoutPlannerTest` (pure JUnit, no Spring). Cover at least:

1. Linked slots (`same linkGroupId`) collapse to one entry naming both slots.
2. Custom label sets `custom=true` and uses the label as `wargear`.
3. Magnetised slot: equipped bit in `wargear`, other owned bits in `spares` when `includeSpares`.
4. Slot with only spares (nothing equipped): `wargear=null`, spares listed, when `includeSpares`.
5. Empty slot with no spares is omitted.
6. When `includeSpares=false`, `spares` is null/absent and a spares-only slot is omitted.

Use generated `CollectionExportLoadoutEntry` builders once Task 1 has regenerated them. Example first test:

```java
@Test
void collapsesLinkedSlotsIntoOneEntry() {
    var left = UUID.randomUUID();
    var right = UUID.randomUUID();
    var optionId = UUID.randomUUID();
    var groupId = UUID.randomUUID();

    var entries =
            LoadoutExportMapper.map(
                    List.of(new Slot(left, "Left hand"), new Slot(right, "Right hand")),
                    List.of(
                            new Selection(left, optionId, null, groupId, true),
                            new Selection(right, optionId, null, groupId, true)),
                    Set.of(),
                    Map.of(optionId, "Plague spewer"),
                    true);

    assertThat(entries).hasSize(1);
    assertThat(entries.getFirst().getSlots()).containsExactly("Left hand", "Right hand");
    assertThat(entries.getFirst().getWargear()).isEqualTo("Plague spewer");
    assertThat(entries.getFirst().getCustom()).isFalse();
}
```

Define package-private or public records `Slot` and `Selection` on the mapper class itself.

- [ ] **Step 2: Run tests to verify they fail**

```powershell
cd backend; .\gradlew.bat test --tests com.keith.battlereadyshelf.collectionexport.LoadoutExportMapperTest
```

Expected: FAIL (class missing).

- [ ] **Step 3: Implement the mapper**

Mirror the rules in `frontend/src/utils/collection/loadoutDisplayItems.ts` and `modelLoadout.ts`:

- Walk slots in the given order.
- For a filled equipped selection with a `linkGroupId`, emit one entry for the whole group the first time that group is seen.
- Equipped determination: `equipped == true`, or `equipped` omitted/`null` when the slot has exactly one filled bit (same as `isEquippedBit`).
- Filled = has `wargearOptionId` or non-blank `customLabel`.
- Resolve name from `optionNames` or custom label.
- Spares = other filled bits on the same slot(s) when magnetised and `includeSpares`.

- [ ] **Step 4: Run tests to verify they pass**

Same command as Step 2. Expected: PASS.

- [ ] **Step 5: Commit (if authorised)**

```powershell
git add backend/src/main/java/com/keith/battlereadyshelf/collectionexport/LoadoutExportMapper.java backend/src/test/java/com/keith/battlereadyshelf/collectionexport/LoadoutExportMapperTest.java
git commit -m "$(cat <<'EOF'
Add loadout export mapper for collection snapshots

EOF
)"
```

---

### Task 3: CollectionExportService

**Files:**
- Create: `backend/src/main/java/com/keith/battlereadyshelf/collectionexport/CollectionExportSchema.java`
- Create: `backend/src/main/java/com/keith/battlereadyshelf/collectionexport/CollectionExportService.java`
- Test: `backend/src/test/java/com/keith/battlereadyshelf/collectionexport/CollectionExportServiceTest.java`

**Interfaces:**
- Consumes: `ArmyCollectionsService.requireOwnedArmyCollection`, repositories listed below, `LoadoutExportMapper`, `PresignedUrlService`
- Produces: `export(userId, CollectionExportRequest) -> CollectionExport`

Repositories to inject (bulk load, no N+1):

- `ArmyCollectionRepository`
- `CollectionModelRepository`
- `CollectionModelWargearSelectionRepository`
- `CollectionModelMagnetizedSlotRepository`
- `CollectionModelStatusEventRepository`
- `CollectionModelImageRepository`
- `ModelDefinitionGroupPositionRepository`
- `AttachmentSlotRepository`
- `WargearOptionRepository`
- `PaintRecipeRepository`
- `FactionRepository`
- `UserRepository`
- `PresignedUrlService`
- `ArmyCollectionsService` (for `requireOwnedArmyCollection` only)

- [ ] **Step 1: Write failing service tests**

`@ExtendWith(MockitoExtension.class)` like `ArmyCollectionsServiceTest`. Minimum cases:

1. Empty `armyCollectionIds` → `BadRequestException`.
2. One id not owned → `NotFoundException` (mock `requireOwnedArmyCollection` to throw), whole call fails.
3. Collections returned in display order, not request order.
4. Model types ordered by `modelDefinitionOrder` then alphabetical.
5. Miniatures ordered by name (case-insensitive), unnamed last, tie-break by id.
6. Each include flag gates its fields; `included` echoes normalised flags (`spareBits` forced off without `wargear`, `statusHistory` forced off without `status`).
7. Paint recipes land on collection / model type / miniature by scope.
8. `thumbnailUrl` only when `thumbnails`; picks `listThumbnail` image, else first by createdAt/id; uses `presignedUrlService.createDownloadUrl` on the thumbnail variant storage key.
9. No UUIDs appear in stringified JSON of the result (assert via ObjectMapper write → string contains no `xxxxxxxx-xxxx` pattern for model/collection ids — or assert generated DTO fields that would hold them are absent by checking only name-based fields are set).

Stub a small fixture: one user, two collections, one model type with two miniatures, one linked loadout, one COLLECTION paint recipe.

- [ ] **Step 2: Run tests — expect FAIL**

```powershell
cd backend; .\gradlew.bat test --tests com.keith.battlereadyshelf.collectionexport.CollectionExportServiceTest
```

- [ ] **Step 3: Implement `CollectionExportSchema` and `CollectionExportService`**

```java
public final class CollectionExportSchema {
    public static final int CURRENT_VERSION = 1;
    private CollectionExportSchema() {}
}
```

Service outline:

1. Deduplicate ids preserving none of the request order.
2. For each id, `requireOwnedArmyCollection`.
3. Load all owned matching collections via `findAllByUserIdOrderByDisplayOrderAsc`, filter to the requested set (gives display order).
4. For each collection, bulk-load models, selections, magnetised slots, status events, images, group positions, recipes.
5. Collect distinct model definition ids → load slots, options, faction names.
6. Build DTOs with include gating; call `LoadoutExportMapper` when `wargear`.
7. Set `schemaVersion`, `exportedAt=Instant.now()`, `ownerDisplayName`, `included`.

`@Transactional(readOnly = true)` on `export`.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit (if authorised)**

```powershell
git add backend/src/main/java/com/keith/battlereadyshelf/collectionexport backend/src/test/java/com/keith/battlereadyshelf/collectionexport
git commit -m "$(cat <<'EOF'
Assemble versioned collection export documents

EOF
)"
```

---

### Task 4: CollectionExportController

**Files:**
- Create: `backend/src/main/java/com/keith/battlereadyshelf/collectionexport/CollectionExportController.java`
- Modify if needed: nothing in `SecurityConfiguration` (authenticated by default is correct)

**Interfaces:**
- Consumes: `CollectionExportService.export`, `AuthenticatedUserProvider`
- Produces: HTTP `200` / generated API method

- [ ] **Step 1: Implement the controller**

```java
@RestController
@RequiredArgsConstructor
public class CollectionExportController implements CollectionExportApi {
    private final CollectionExportService collectionExportService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @Override
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<CollectionExport> exportArmyCollections(
            CollectionExportRequest collectionExportRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        return ResponseEntity.ok(
                collectionExportService.export(currentUser.id(), collectionExportRequest));
    }
}
```

Match the generated method signature exactly after codegen (parameter name may differ).

- [ ] **Step 2: Add a focused ownership/auth note test if feasible**

Prefer keeping ownership coverage in the service test. Optionally extend `SecurityServletPathTest` only if there is an existing pattern for asserting authenticated POSTs; do not invent a full MockMvc suite for this task.

- [ ] **Step 3: Full backend build**

```powershell
cd backend; .\gradlew.bat build
```

Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit (if authorised)**

```powershell
git add backend/src/main/java/com/keith/battlereadyshelf/collectionexport/CollectionExportController.java
git commit -m "$(cat <<'EOF'
Expose collection export endpoint

EOF
)"
```

---

### Task 5: Frontend pure helpers

**Files:**
- Create: `frontend/src/utils/downloadFile.ts`
- Modify: `frontend/src/components/admin/DefinitionTransferButtons.tsx` (use `downloadFile`)
- Create: `frontend/src/utils/collectionExport/exportOptions.ts`
- Create: `frontend/src/utils/collectionExport/exportFileName.ts`
- Create: `frontend/src/utils/collectionExport/summariseModelType.ts`
- Tests: colocated `*.test.ts` for each new util

**Interfaces:**
- Produces:
  - `downloadFile(contents: string, fileName: string, mimeType: string): void`
  - `ExportFormat = "json" | "html" | "markdown"`
  - `ExportDetail = "summary" | "every"`
  - `optionApplies(flag, format, detail): boolean`
  - `includeFlagsForRequest(uiState): CollectionExportInclude` (forces inapplicable and dependent flags off)
  - `exportFileName(collections: { name?: string }[], format, date?: Date): string`
  - `summariseModelType(type: CollectionExportModelType): { loadoutGroups: { count: number; loadout: CollectionExportLoadoutEntry[] }[] }`

- [ ] **Step 1: Write failing tests for `exportOptions`, `exportFileName`, `summariseModelType`**

`exportOptions.test.ts` cases:

- Thumbnails apply only for HTML + every.
- Status history applies only when status on and (json or every).
- Spare bits apply only when wargear on.
- `includeFlagsForRequest` forces disabled options to `false` even if the checkbox state is true.

`exportFileName.test.ts`:

- One collection → `death-guard-2026-11-20.json`
- Several → `collections-2026-11-20.md`
- Name `"!!!"` → `collection-2026-11-20.html`

`summariseModelType.test.ts`:

- Two identical loadouts → one group with count 2
- Different loadouts stay separate
- Stable order (first occurrence order)

- [ ] **Step 2: Run Vitest — expect FAIL**

```powershell
cd frontend; npm test -- src/utils/collectionExport
```

- [ ] **Step 3: Implement helpers and extract `downloadFile`**

`downloadFile.ts`:

```typescript
export default function downloadFile(contents: string, fileName: string, mimeType: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
```

Refactor `DefinitionTransferButtons` `handleExport` to call it. Keep its existing try/catch + `showErrorNotification` behaviour.

Slug: lower-case, replace `/[^a-z0-9]+/g` with `-`, trim hyphens, fallback `collection`.

Loadout equality for summarise: `JSON.stringify` of a normalised `{ slots, wargear, custom, spares }` with sorted slots and sorted spares.

- [ ] **Step 4: Run Vitest — expect PASS**

- [ ] **Step 5: Commit (if authorised)**

```powershell
git add frontend/src/utils/downloadFile.ts frontend/src/utils/collectionExport frontend/src/components/admin/DefinitionTransferButtons.tsx
git commit -m "$(cat <<'EOF'
Add collection export helpers and shared downloadFile

EOF
)"
```

---

### Task 6: Markdown and HTML renderers

**Files:**
- Create: `frontend/src/utils/collectionExport/escape.ts`
- Create: `frontend/src/utils/collectionExport/renderMarkdown.ts`
- Create: `frontend/src/utils/collectionExport/renderHtml.ts`
- Tests: `escape.test.ts`, `renderMarkdown.test.ts`, `renderHtml.test.ts`

**Interfaces:**
- Produces:
  - `escapeHtml(text: string): string`
  - `escapeMarkdownInline(text: string): string`
  - `renderMarkdown(doc: CollectionExport, detail: ExportDetail): string`
  - `renderHtml(doc: CollectionExport, detail: ExportDetail, thumbnails: ReadonlyMap<string, string>): string`

- [ ] **Step 1: Write failing renderer tests**

Shared fixture document with: two collections, hostile name `<script>x</script>`, paint with `hexColour`, one miniature with thumbnailUrl, `included` toggling fields.

Assert:

- Content with `included.*=false` does not appear.
- Summary collapses loadouts and omits miniature-only fields.
- Every miniature shows names / history when included.
- HTML escapes `<script>`; Markdown escapes heading markers in names.
- HTML `hexColour` only becomes a style when it matches `^#[0-9A-Fa-f]{6}$`.
- HTML has no `http`/`https` URLs left for thumbnails when a data URI map is provided (img `src` is `data:`).
- Footer line mentions BattleReadyShelf and the export date.

- [ ] **Step 2: Run tests — expect FAIL**

```powershell
cd frontend; npm test -- src/utils/collectionExport/render
```

- [ ] **Step 3: Implement escape + both renderers**

Markdown structure:

```markdown
# Death Guard

description...

- 42 models
- Painted: 30, Primed: 12

## Paint recipe
...

## Plague Marine (Death Guard) — 12

- 12× boltgun, plague knife
```

HTML: single file, `<style>` block with light print-friendly CSS, no scripts. Every miniature mode: flex row with optional `<img>` from the thumbnails map keyed by original `thumbnailUrl`.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit (if authorised)**

```powershell
git add frontend/src/utils/collectionExport
git commit -m "$(cat <<'EOF'
Render collection exports as Markdown and HTML

EOF
)"
```

---

### Task 7: Thumbnail inlining and export hook

**Files:**
- Create: `frontend/src/utils/collectionExport/inlineThumbnails.ts`
- Create: `frontend/src/hooks/collections/useCollectionExport.ts`
- Tests: `inlineThumbnails.test.ts`, `useCollectionExport.test.ts` (hook test via RTL + `stubApi`)

**Interfaces:**
- Produces:
  - `inlineThumbnails(urls: string[], onProgress?: (done: number, total: number) => void): Promise<{ dataUris: Map<string, string>; failed: number }>` (concurrency 6)
  - `useCollectionExport()` → `{ exporting, progress, exportCollections(args): Promise<void> }` where args cover format, detail, include UI state, collection ids + names, and `mode: "download" | "copy"`

- [ ] **Step 1: Write failing tests**

`inlineThumbnails`: mock `globalThis.fetch` — two OK, one fail → map size 2, `failed === 1`.

`useCollectionExport`:

- Calls `POST` body matching `includeFlagsForRequest`.
- On 500 from stubApi, does not call download (spy `downloadFile`).
- Markdown copy path calls `navigator.clipboard.writeText`.
- Thumbnail progress callback invoked when format is HTML with thumbnails.

- [ ] **Step 2: Run tests — expect FAIL**

```powershell
cd frontend; npm test -- src/utils/collectionExport/inlineThumbnails.test.ts src/hooks/collections/useCollectionExport.test.ts
```

- [ ] **Step 3: Implement**

Hook flow:

1. Build request via `includeFlagsForRequest`.
2. `exportArmyCollections({ body, throwOnError: true })`.
3. If HTML and thumbnails requested, collect URLs, `inlineThumbnails`, notify on failures with `showErrorNotification` if `failed > 0`.
4. Render / stringify.
5. Download via `downloadFile` or clipboard write; clipboard failure → `showErrorNotification` if `!isAxiosError`.

MIME types: `application/json`, `text/html;charset=utf-8`, `text/markdown;charset=utf-8`.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit (if authorised)**

```powershell
git add frontend/src/utils/collectionExport/inlineThumbnails.ts frontend/src/hooks/collections/useCollectionExport.ts frontend/src/utils/collectionExport/inlineThumbnails.test.ts frontend/src/hooks/collections/useCollectionExport.test.ts
git commit -m "$(cat <<'EOF'
Orchestrate collection export downloads and thumbnail embedding

EOF
)"
```

---

### Task 8: Export dialog and entry points

**Files:**
- Create: `frontend/src/components/collections/export/ExportCollectionsModal.tsx`
- Create: `frontend/src/components/collections/export/ExportCollectionsModal.test.tsx`
- Modify: `frontend/src/components/collections/CollectionsHeader.tsx`
- Modify: `frontend/src/pages/CollectionsPage.tsx` (wire modal state + collections list)
- Modify: `frontend/src/components/collection/CollectionHeader.tsx`

**Interfaces:**
- Consumes: `useCollectionExport`, `optionApplies`, collections from props
- Produces: modal UX matching the spec table of defaults

- [ ] **Step 1: Write failing modal tests**

Using MantineProvider + stubApi:

1. Default format JSON; detail disabled; thumbnails checkbox disabled.
2. Switching to HTML + Every enables thumbnails.
3. Turning wargear off disables spare bits.
4. Download disabled when no collections ticked (multi mode).
5. On export API 500, dialog stays open (`getByRole("dialog")` still present).

- [ ] **Step 2: Run tests — expect FAIL**

```powershell
cd frontend; npm test -- src/components/collections/export
```

- [ ] **Step 3: Implement modal + wire headers**

`ExportCollectionsModal` props:

```typescript
type Props = Readonly<{
  opened: boolean;
  onClose: () => void;
  collections: ArmyCollection[]; // candidates for the checklist
  initialSelectedIds?: string[]; // Collection page passes a single id
  showCollectionPicker: boolean;
}>;
```

UI: `ResponsiveModal` titled "Export collections", checkboxes / radios as in the spec, footer with Download (+ Copy when Markdown).

`CollectionsHeader`: add Export button (IconDownload) next to Create when authenticated, `disabled` when `!isUser` or collections empty — pass `onExport` callback and `canExport`.

`CollectionHeader`: Export button for owner only, opens modal with `showCollectionPicker={false}` and the current collection.

- [ ] **Step 4: Run tests — expect PASS**; also `npm run lint` and `npm run build`

- [ ] **Step 5: Commit (if authorised)**

```powershell
git add frontend/src/components/collections/export frontend/src/components/collections/CollectionsHeader.tsx frontend/src/pages/CollectionsPage.tsx frontend/src/components/collection/CollectionHeader.tsx
git commit -m "$(cat <<'EOF'
Add collection export dialog and entry points

EOF
)"
```

---

### Task 9: Screenshot scenarios and manual checks

**Files:**
- Modify: `frontend/scripts/scenarios.mjs`

- [ ] **Step 1: Add scenarios**

```javascript
{
  name: "collections-export-modal",
  route: "/collections",
  prepare: (page) => openModal(page, "Export"),
},
{
  name: "collections-export-error",
  route: "/collections",
  failApi: [
    {
      url: "**/api/v1/army-collections/export",
      method: "POST",
      status: 500,
      message: "The export service is unavailable.",
    },
  ],
  prepare: async (page) => {
    await openModal(page, "Export");
    await page.getByRole("button", { name: "Download" }).click();
    await expectMessage(page, "The export service is unavailable.");
    await expectStillSignedIn(page);
    await page.getByRole("dialog").waitFor();
    await settle(page);
  },
},
```

- [ ] **Step 2: Run the new scenarios**

```powershell
cd frontend; npm run screenshot -- --scenario=collections-export-modal
cd frontend; npm run screenshot -- --scenario=collections-export-error
```

Expected: both exit 0 (requires local app + auth fixture as for existing scenarios).

- [ ] **Step 3: Manual prerequisites (human)**

1. **R2 CORS:** In Cloudflare R2 bucket CORS, allow `GET` (and existing PUT) from local and production app origins. Without this, HTML+thumbnails exports show the "no photos" notification.
2. **Size check:** Export a large collection with HTML + Every + thumbnails; confirm the file opens and is a reasonable size to share. Record approximate size in the PR description.

- [ ] **Step 4: Commit scenarios (if authorised)**

```powershell
git add frontend/scripts/scenarios.mjs
git commit -m "$(cat <<'EOF'
Add screenshot scenarios for collection export

EOF
)"
```

---

## Spec coverage checklist

| Spec section | Task |
|---|---|
| User flow / dialog / defaults | 8 |
| Formats + copy Markdown | 7, 8 |
| Combined multi-collection document | 3 |
| Whole-collection scope (ignore filters) | 3, 8 |
| Summary vs Every miniature | 5, 6 |
| HTML thumbnails only | 3, 6, 7 |
| Owner-only + 404 | 3, 4 |
| `included` echo + flag gating | 3, 5 |
| Separate `collection-export.yaml` + fallback | 1 |
| Loadout collapsing / spares | 2 |
| Ordering (collections, types, miniatures) | 3 |
| No UUIDs / schemaVersion 1 | 3 |
| Escape + self-contained HTML | 6 |
| Error handling / partial thumbnail failure | 7, 8 |
| `downloadFile` extraction | 5 |
| Screenshot scenarios | 9 |
| R2 CORS + size check | 9 |
| Out of scope (import, filters, alternates, …) | intentionally omitted |

## Placeholder / consistency review

- No TBD/TODO left in tasks.
- Type names match across tasks (`CollectionExportInclude`, `ExportDetail`, `includeFlagsForRequest`).
- Commit steps respect AGENTS.md via the global constraint.

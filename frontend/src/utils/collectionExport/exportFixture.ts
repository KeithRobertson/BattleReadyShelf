import type { CollectionExport, CollectionExportInclude } from "@/generated";

export const ALL_INCLUDED: CollectionExportInclude = {
  collectionDescription: true,
  faction: true,
  status: true,
  statusHistory: true,
  wargear: true,
  spareBits: true,
  paintRecipes: true,
  miniatureDetails: true,
  thumbnails: true,
};

/** Shared hostile fixture for Markdown / HTML renderer tests. */
export function makeExportDoc(
  included: CollectionExportInclude = ALL_INCLUDED,
): CollectionExport {
  return {
    schemaVersion: 1,
    exportedAt: "2026-11-20T11:04:00Z",
    ownerDisplayName: "Keith",
    included,
    collections: [
      {
        name: "<script>x</script>",
        description: "First collection description",
        modelCount: 2,
        statusCounts: { PAINTED: 1, PRIMED: 1 },
        paintRecipe: {
          notes: "Collection recipe notes",
          paints: [
            {
              name: "Death Guard Green",
              brand: "Citadel",
              paintType: "BASE",
              hexColour: "#848A66",
              step: "Base",
              note: "thinned 2:1",
            },
            {
              name: "Evil paint",
              hexColour: "red;background:url(javascript:alert(1))",
            },
          ],
        },
        modelTypes: [
          {
            name: "# Evil Heading",
            faction: "Death Guard",
            modelCount: 2,
            statusCounts: { PAINTED: 1, PRIMED: 1 },
            paintRecipe: null,
            miniatures: [
              {
                name: "Champion",
                description: "Boss guy",
                status: "PAINTED",
                statusChangedAt: "2026-10-02T18:30:00Z",
                statusHistory: [
                  { status: "PAINTED", changedAt: "2026-10-02T18:30:00Z" },
                  { status: "PRIMED", changedAt: "2026-09-01T12:00:00Z" },
                ],
                loadout: [
                  { slots: ["Right hand"], wargear: "Boltgun", custom: false },
                  { slots: ["Left hand"], wargear: "Plague knife", custom: false },
                ],
                paintRecipe: {
                  notes: "Miniature-only recipe",
                  paints: [{ name: "Leadbelcher", hexColour: "#888888" }],
                },
                thumbnailUrl: "https://cdn.example/thumb1.jpg",
              },
              {
                name: null,
                description: null,
                status: "PRIMED",
                statusChangedAt: "2026-09-15T10:00:00Z",
                statusHistory: [{ status: "PRIMED", changedAt: "2026-09-15T10:00:00Z" }],
                loadout: [
                  { slots: ["Right hand"], wargear: "Boltgun", custom: false },
                  { slots: ["Left hand"], wargear: "Plague knife", custom: false },
                ],
                paintRecipe: null,
                thumbnailUrl: null,
              },
            ],
          },
        ],
      },
      {
        name: "Second Collection",
        description: "Second description",
        modelCount: 0,
        modelTypes: [],
      },
    ],
  };
}

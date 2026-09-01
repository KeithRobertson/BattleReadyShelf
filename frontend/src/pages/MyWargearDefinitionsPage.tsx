import { Text } from "@mantine/core";
import { useMemo, useState } from "react";
import DefinitionDiffModal, { PERSONAL_DIFF_LABELS } from "@/components/definitions/DefinitionDiffModal.tsx";
import WargearNameModal from "@/components/definitions/WargearNameModal.tsx";
import PersonalCatalogueView, {
  type PersonalCatalogueColumn,
} from "@/components/mydefinitions/PersonalCatalogueView.tsx";
import usePersonalCatalogue from "@/components/mydefinitions/usePersonalCatalogue.ts";
import type { WargearDefinition } from "@/generated";
import {
  createMyWargearDefinition,
  customiseWargearDefinition,
  deleteMyWargearDefinition,
  getMyWargearDefinitions,
  getSharedWargearDefinitions,
  updateMyWargearDefinition,
} from "@/generated";
import { MODEL_DEFINITIONS_KEY } from "@/queryKeys.ts";
import extractErrorMessage from "@/utils/extractErrorMessage.ts";
import { diffFields, fieldChange } from "@/utils/personalFieldDiff";

const DIFF_LABELS = {
  ...PERSONAL_DIFF_LABELS,
  isNewMessage: "You named this wargear yourself, so there is no shared version to compare it against.",
  identicalMessage: "Your version matches the shared wargear exactly — you have not renamed it yet.",
};

/** What the name modal is open for: nothing, new wargear, or something the user already owns. */
type Editing = { mode: "closed" } | { mode: "create" } | { mode: "edit"; definition: WargearDefinition };

// A model definition carries the names of the wargear its options point at, so renaming wargear
// here changes what collection pages show for those models.
const CACHED_QUERY_KEYS = [MODEL_DEFINITIONS_KEY];

const COLUMNS: PersonalCatalogueColumn<WargearDefinition>[] = [
  {
    header: "Used by",
    render: (definition) =>
      definition.usageCount ? (
        <Text size="sm">{definition.usageCount}</Text>
      ) : (
        <Text size="sm" c="dimmed">
          Unused
        </Text>
      ),
  },
];

export default function MyWargearDefinitionsPage() {
  const api = useMemo(
    () => ({
      loadMine: async (signal?: AbortSignal) => (await getMyWargearDefinitions({ signal })).data ?? [],
      loadShared: async (signal?: AbortSignal) => (await getSharedWargearDefinitions({ signal })).data ?? [],
      customise: async (wargearDefinitionId: string) =>
        (await customiseWargearDefinition({ path: { wargearDefinitionId } })).data,
      remove: async (wargearDefinitionId: string) => {
        await deleteMyWargearDefinition({ path: { wargearDefinitionId } });
      },
    }),
    [],
  );

  const catalogue = usePersonalCatalogue<WargearDefinition>(api, CACHED_QUERY_KEYS);
  const { mine, shared, upsertMine, setError, notifyChanged } = catalogue;

  const [editing, setEditing] = useState<Editing>({ mode: "closed" });
  const [diffTarget, setDiffTarget] = useState<WargearDefinition | null>(null);
  const [saving, setSaving] = useState(false);

  const sharedById = useMemo(() => new Map(shared.map((definition) => [definition.id ?? "", definition])), [shared]);

  const diffsById = useMemo(() => {
    const entries = mine.map((definition) => {
      const base = definition.baseWargearDefinitionId ? sharedById.get(definition.baseWargearDefinitionId) : undefined;
      const diff = diffFields([fieldChange("Name", base?.name, definition.name)], base === undefined);
      return [definition.id ?? "", diff] as const;
    });
    return new Map(entries);
  }, [mine, sharedById]);

  async function handleSave(name: string) {
    if (editing.mode === "closed") return;
    setError(null);
    setSaving(true);
    try {
      const body = { name };
      const saved =
        editing.mode === "create"
          ? (await createMyWargearDefinition({ body })).data
          : (
              await updateMyWargearDefinition({
                path: { wargearDefinitionId: editing.definition.id ?? "" },
                body,
              })
            ).data;
      if (!saved) {
        setError("Failed to save this wargear");
        return;
      }
      upsertMine(saved);
      notifyChanged();
      setEditing({ mode: "closed" });
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleCustomise(definition: WargearDefinition) {
    const created = await catalogue.handleCustomise(definition.id ?? "");
    if (created) setEditing({ mode: "edit", definition: created });
  }

  return (
    <PersonalCatalogueView
      title="My Wargear"
      description="Name wargear of your own, or rename the shared entries for yourself. Everything here is visible only to you."
      createLabel="Add your own"
      emptyMineMessage="You have not added or renamed any wargear yet. Customise one below, or add your own."
      unauthorisedMessage="Sign in to add and rename your own wargear."
      sharedTitle="Shared wargear"
      revertLabel="Revert to the shared version"
      isAuthenticated={catalogue.isAuthenticated}
      isAuthLoading={catalogue.isAuthLoading}
      loading={catalogue.loading}
      error={catalogue.error}
      mine={mine}
      shared={shared}
      columns={COLUMNS}
      baseIdOf={(definition) => definition.baseWargearDefinitionId}
      diffsById={diffsById}
      customisingIds={catalogue.customisingIds}
      removingIds={catalogue.removingIds}
      onCreate={() => setEditing({ mode: "create" })}
      onEdit={(definition) => setEditing({ mode: "edit", definition })}
      onDiff={setDiffTarget}
      onCustomise={handleCustomise}
      onRemove={(definition) => catalogue.handleRemove(definition.id ?? "")}
    >
      <WargearNameModal
        opened={editing.mode !== "closed"}
        title={editing.mode === "create" ? "Add your own wargear" : "Rename your wargear"}
        submitLabel="Save"
        definition={editing.mode === "edit" ? editing.definition : null}
        saving={saving}
        onClose={() => setEditing({ mode: "closed" })}
        onSave={handleSave}
      />

      <DefinitionDiffModal
        opened={diffTarget !== null}
        onClose={() => setDiffTarget(null)}
        definitionName={diffTarget?.name ?? ""}
        diff={diffTarget ? (diffsById.get(diffTarget.id ?? "") ?? null) : null}
        labels={DIFF_LABELS}
      />
    </PersonalCatalogueView>
  );
}

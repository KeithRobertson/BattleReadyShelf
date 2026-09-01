import { Text } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import DefinitionDiffModal, { PERSONAL_DIFF_LABELS } from "@/components/definitions/DefinitionDiffModal.tsx";
import FactionFormModal from "@/components/definitions/FactionFormModal.tsx";
import PersonalCatalogueView, {
  type PersonalCatalogueColumn,
} from "@/components/mydefinitions/PersonalCatalogueView.tsx";
import usePersonalCatalogue from "@/components/mydefinitions/usePersonalCatalogue.ts";
import type { Faction } from "@/generated";
import {
  createMyFaction,
  customiseFaction,
  deleteMyFaction,
  getMyFactions,
  getSharedFactions,
  updateMyFaction,
} from "@/generated";
import { FACTIONS_KEY } from "@/queryKeys.ts";
import extractErrorMessage from "@/utils/extractErrorMessage.ts";
import { diffFields, fieldChange } from "@/utils/personalFieldDiff";

const DIFF_LABELS = {
  ...PERSONAL_DIFF_LABELS,
  isNewMessage: "You created this faction yourself, so there is no shared version to compare it against.",
  identicalMessage: "Your version matches the shared faction exactly — you have not changed anything yet.",
};

/** What the form modal is open for: nothing, a new faction, or one the user already owns. */
type Editing = { mode: "closed" } | { mode: "create" } | { mode: "edit"; faction: Faction };

// Collection pages group the model picker by faction and offer a faction filter, both fed by this
// cached query. Adding or renaming a faction here has to drop it or the change is invisible there
// until that page is next mounted.
const CACHED_QUERY_KEYS = [FACTIONS_KEY];

export default function MyFactionsPage() {
  const api = useMemo(
    () => ({
      loadMine: async (signal?: AbortSignal) => (await getMyFactions({ signal })).data ?? [],
      loadShared: async (signal?: AbortSignal) => (await getSharedFactions({ signal })).data ?? [],
      customise: async (factionId: string) => (await customiseFaction({ path: { factionId } })).data,
      remove: async (factionId: string) => {
        await deleteMyFaction({ path: { factionId } });
      },
    }),
    [],
  );

  const catalogue = usePersonalCatalogue<Faction>(api, CACHED_QUERY_KEYS);
  const { mine, shared, upsertMine, setError, notifyChanged } = catalogue;

  const [editing, setEditing] = useState<Editing>({ mode: "closed" });
  const [diffTarget, setDiffTarget] = useState<Faction | null>(null);
  const [saving, setSaving] = useState(false);

  const nameById = useMemo(
    () => new Map([...shared, ...mine].map((faction) => [faction.id ?? "", faction.name])),
    [shared, mine],
  );
  const sharedById = useMemo(() => new Map(shared.map((faction) => [faction.id ?? "", faction])), [shared]);

  const parentName = useCallback(
    (factionId: string | null | undefined) => (factionId ? (nameById.get(factionId) ?? "Unknown") : null),
    [nameById],
  );

  const diffsById = useMemo(() => {
    const entries = mine.map((faction) => {
      const base = faction.baseFactionId ? sharedById.get(faction.baseFactionId) : undefined;
      const diff = diffFields(
        [
          fieldChange("Name", base?.name, faction.name),
          fieldChange("Parent", parentName(base?.parentFactionId), parentName(faction.parentFactionId)),
        ],
        base === undefined,
      );
      return [faction.id ?? "", diff] as const;
    });
    return new Map(entries);
  }, [mine, sharedById, parentName]);

  const columns: PersonalCatalogueColumn<Faction>[] = useMemo(
    () => [
      {
        header: "Parent",
        render: (faction) => (
          <Text size="sm" c="dimmed">
            {parentName(faction.parentFactionId) ?? "None"}
          </Text>
        ),
      },
    ],
    [parentName],
  );

  // Every faction one of the user's own can sit beneath: the shared tree plus their own. The modal
  // filters out the faction being edited so it cannot become its own parent.
  const parentChoices = useMemo(() => [...shared, ...mine], [shared, mine]);

  async function handleSave(name: string, parentFactionId: string | null) {
    if (editing.mode === "closed") return;
    setError(null);
    setSaving(true);
    try {
      const body = { name, parentFactionId };
      const saved =
        editing.mode === "create"
          ? (await createMyFaction({ body })).data
          : (await updateMyFaction({ path: { factionId: editing.faction.id ?? "" }, body })).data;
      if (!saved) {
        setError("Failed to save this faction");
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

  async function handleCustomise(faction: Faction) {
    const created = await catalogue.handleCustomise(faction.id ?? "");
    if (created) setEditing({ mode: "edit", faction: created });
  }

  return (
    <PersonalCatalogueView
      title="My Factions"
      description="Add factions of your own, or tweak the shared ones. Everything here is visible only to you."
      createLabel="Create your own"
      emptyMineMessage="You have not added or customised any factions yet. Customise one below to get started."
      unauthorisedMessage="Sign in to create and customise your own factions."
      sharedTitle="Shared factions"
      revertLabel="Revert to the shared version"
      isAuthenticated={catalogue.isAuthenticated}
      isAuthLoading={catalogue.isAuthLoading}
      loading={catalogue.loading}
      error={catalogue.error}
      mine={mine}
      shared={shared}
      columns={columns}
      baseIdOf={(faction) => faction.baseFactionId}
      diffsById={diffsById}
      customisingIds={catalogue.customisingIds}
      removingIds={catalogue.removingIds}
      onCreate={() => setEditing({ mode: "create" })}
      onEdit={(faction) => setEditing({ mode: "edit", faction })}
      onDiff={setDiffTarget}
      onCustomise={handleCustomise}
      onRemove={(faction) => catalogue.handleRemove(faction.id ?? "")}
    >
      <FactionFormModal
        opened={editing.mode !== "closed"}
        title={editing.mode === "create" ? "Create your own faction" : "Edit your faction"}
        submitLabel="Save"
        faction={editing.mode === "edit" ? editing.faction : null}
        factions={parentChoices}
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

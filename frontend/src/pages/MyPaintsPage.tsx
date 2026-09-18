import { Group, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import DefinitionDiffModal, { PERSONAL_DIFF_LABELS } from "@/components/definitions/DefinitionDiffModal.tsx";
import { isHidden } from "@/components/mydefinitions/catalogueVisibility";
import HidePaintsByGroup from "@/components/mydefinitions/HidePaintsByGroup.tsx";
import PaintFormModal, { type PaintFormValues, paintTypeLabel } from "@/components/mydefinitions/PaintFormModal.tsx";
import PersonalCatalogueView, {
  type PersonalCatalogueColumn,
} from "@/components/mydefinitions/PersonalCatalogueView.tsx";
import usePersonalCatalogue from "@/components/mydefinitions/usePersonalCatalogue.ts";
import PaintSwatch from "@/components/paints/PaintSwatch.tsx";
import type { Paint } from "@/generated";
import { createMyPaint, customisePaint, deleteMyPaint, getMyPaints, getSharedPaints, updateMyPaint } from "@/generated";
import { PAINTS_KEY } from "@/queryKeys.ts";
import { paintBrandCounts } from "@/utils/admin/catalogueStats";
import { diffFields, fieldChange } from "@/utils/personalFieldDiff";

const DIFF_LABELS = {
  ...PERSONAL_DIFF_LABELS,
  isNewMessage: "You created this paint yourself, so there is no shared version to compare it against.",
  identicalMessage: "Your version matches the shared paint exactly — you have not changed anything yet.",
};

type Editing = { mode: "closed" } | { mode: "create" } | { mode: "edit"; paint: Paint };

const CACHED_QUERY_KEYS = [PAINTS_KEY];

const COLUMNS: PersonalCatalogueColumn<Paint>[] = [
  {
    header: "Brand",
    render: (paint) => (
      <Text size="sm" c={paint.brand ? undefined : "dimmed"}>
        {paint.brand ?? "None"}
      </Text>
    ),
  },
  {
    header: "Type",
    render: (paint) => (
      <Text size="sm" c={paint.paintType ? undefined : "dimmed"}>
        {paintTypeLabel(paint.paintType) ?? "None"}
      </Text>
    ),
  },
];

function PaintName({ paint }: Readonly<{ paint: Paint }>) {
  return (
    <Group gap="xs" wrap="nowrap">
      <PaintSwatch hexColour={paint.hexColour} label={paint.name} />
      <Text span>{paint.name}</Text>
    </Group>
  );
}

export default function MyPaintsPage() {
  const api = useMemo(
    () => ({
      loadMine: async (signal?: AbortSignal) => (await getMyPaints({ signal, throwOnError: true })).data ?? [],
      loadShared: async (signal?: AbortSignal) => (await getSharedPaints({ signal, throwOnError: true })).data ?? [],
      customise: async (paintId: string) => (await customisePaint({ path: { paintId }, throwOnError: true })).data,
      remove: async (paintId: string) => {
        await deleteMyPaint({ path: { paintId }, throwOnError: true });
      },
    }),
    [],
  );

  const catalogue = usePersonalCatalogue<Paint>(api, "PAINT", CACHED_QUERY_KEYS);
  const { mine, shared, upsertMine, notifyChanged } = catalogue;
  const hiddenByBrand = useMemo(
    () => [
      {
        title: "Hidden by brand",
        items: paintBrandCounts([...mine, ...shared].filter(isHidden)),
        hideEmpty: true,
      },
    ],
    [mine, shared],
  );

  const [editing, setEditing] = useState<Editing>({ mode: "closed" });
  const [diffTarget, setDiffTarget] = useState<Paint | null>(null);
  const [saving, setSaving] = useState(false);

  const sharedById = useMemo(() => new Map(shared.map((paint) => [paint.id ?? "", paint])), [shared]);

  const diffsById = useMemo(() => {
    const entries = mine.map((paint) => {
      const base = paint.basePaintId ? sharedById.get(paint.basePaintId) : undefined;
      const diff = diffFields(
        [
          fieldChange("Name", base?.name, paint.name),
          fieldChange("Brand", base?.brand, paint.brand),
          fieldChange("Type", paintTypeLabel(base?.paintType), paintTypeLabel(paint.paintType)),
          fieldChange("Colour", base?.hexColour, paint.hexColour),
        ],
        base === undefined,
      );
      return [paint.id ?? "", diff] as const;
    });
    return new Map(entries);
  }, [mine, sharedById]);

  async function handleSave(values: PaintFormValues) {
    if (editing.mode === "closed") return;
    setSaving(true);
    try {
      const saved =
        editing.mode === "create"
          ? (await createMyPaint({ body: values, throwOnError: true })).data
          : (await updateMyPaint({ path: { paintId: editing.paint.id ?? "" }, body: values, throwOnError: true })).data;
      // Nothing came back, so the request failed and the API layer has already said why. Leaving
      // the modal open keeps what they typed available to retry.
      if (!saved) return;
      upsertMine(saved);
      notifyChanged();
      setEditing({ mode: "closed" });
    } catch {
      // Same again: reported as a notification, modal stays open.
    } finally {
      setSaving(false);
    }
  }

  async function handleCustomise(paint: Paint) {
    const created = await catalogue.handleCustomise(paint.id ?? "");
    if (created) setEditing({ mode: "edit", paint: created });
  }

  return (
    <PersonalCatalogueView
      title="My Paints"
      description="Add paints of your own, or tweak the shared ones. Hide brands you do not use so they stop appearing in recipe pickers."
      createLabel="Create your own"
      emptyMineMessage="You have not added or customised any paints yet. Customise one below to get started."
      unauthorisedMessage="Sign in to create and customise your own paints."
      sharedTitle="Shared paints"
      revertLabel="Revert to the shared version"
      isAuthenticated={catalogue.isAuthenticated}
      isAuthLoading={catalogue.isAuthLoading}
      loading={catalogue.loading}
      loadFailed={catalogue.loadFailed}
      mine={mine}
      shared={shared}
      columns={COLUMNS}
      renderName={(paint) => <PaintName paint={paint} />}
      baseIdOf={(paint) => paint.basePaintId}
      diffsById={diffsById}
      customisingIds={catalogue.customisingIds}
      removingIds={catalogue.removingIds}
      hidingIds={catalogue.hidingIds}
      onCreate={() => setEditing({ mode: "create" })}
      onEdit={(paint) => setEditing({ mode: "edit", paint })}
      onDiff={setDiffTarget}
      onCustomise={handleCustomise}
      onRemove={(paint) => catalogue.handleRemove(paint.id ?? "")}
      onSetHidden={catalogue.handleSetHidden}
      tools={
        <HidePaintsByGroup
          paints={[...mine, ...shared]}
          hidingIds={catalogue.hidingIds}
          onSetHidden={catalogue.handleSetHidden}
        />
      }
      asideTitle="Your paints"
      asideDescription="Paints you have added or customised, and how many you have taken out of pickers."
      asideLists={hiddenByBrand}
    >
      <PaintFormModal
        opened={editing.mode !== "closed"}
        title={editing.mode === "create" ? "Create your own paint" : "Edit your paint"}
        submitLabel="Save"
        paint={editing.mode === "edit" ? editing.paint : null}
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

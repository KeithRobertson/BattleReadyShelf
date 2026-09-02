import { Group, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import DefinitionDiffModal, { PERSONAL_DIFF_LABELS } from "@/components/definitions/DefinitionDiffModal.tsx";
import PaintFormModal, { paintTypeLabel, type PaintFormValues } from "@/components/mydefinitions/PaintFormModal.tsx";
import PersonalCatalogueView, {
  type PersonalCatalogueColumn,
} from "@/components/mydefinitions/PersonalCatalogueView.tsx";
import usePersonalCatalogue from "@/components/mydefinitions/usePersonalCatalogue.ts";
import PaintSwatch from "@/components/paints/PaintSwatch.tsx";
import type { Paint } from "@/generated";
import {
  createMyPaint,
  customisePaint,
  deleteMyPaint,
  getMyPaints,
  getSharedPaints,
  updateMyPaint,
} from "@/generated";
import extractErrorMessage from "@/utils/extractErrorMessage.ts";
import { diffFields, fieldChange } from "@/utils/personalFieldDiff";

const DIFF_LABELS = {
  ...PERSONAL_DIFF_LABELS,
  isNewMessage: "You created this paint yourself, so there is no shared version to compare it against.",
  identicalMessage: "Your version matches the shared paint exactly — you have not changed anything yet.",
};

type Editing = { mode: "closed" } | { mode: "create" } | { mode: "edit"; paint: Paint };

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
      loadMine: async (signal?: AbortSignal) => (await getMyPaints({ signal })).data ?? [],
      loadShared: async (signal?: AbortSignal) => (await getSharedPaints({ signal })).data ?? [],
      customise: async (paintId: string) => (await customisePaint({ path: { paintId } })).data,
      remove: async (paintId: string) => {
        await deleteMyPaint({ path: { paintId } });
      },
    }),
    [],
  );

  const catalogue = usePersonalCatalogue<Paint>(api);
  const { mine, shared, upsertMine, setError, notifyChanged } = catalogue;

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
    setError(null);
    setSaving(true);
    try {
      const saved =
        editing.mode === "create"
          ? (await createMyPaint({ body: values })).data
          : (await updateMyPaint({ path: { paintId: editing.paint.id ?? "" }, body: values })).data;
      if (!saved) {
        setError("Failed to save this paint");
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

  async function handleCustomise(paint: Paint) {
    const created = await catalogue.handleCustomise(paint.id ?? "");
    if (created) setEditing({ mode: "edit", paint: created });
  }

  return (
    <PersonalCatalogueView
      title="My Paints"
      description="Add paints of your own, or tweak the shared ones. Everything here is visible only to you."
      createLabel="Create your own"
      emptyMineMessage="You have not added or customised any paints yet. Customise one below to get started."
      unauthorisedMessage="Sign in to create and customise your own paints."
      sharedTitle="Shared paints"
      revertLabel="Revert to the shared version"
      isAuthenticated={catalogue.isAuthenticated}
      isAuthLoading={catalogue.isAuthLoading}
      loading={catalogue.loading}
      error={catalogue.error}
      mine={mine}
      shared={shared}
      columns={COLUMNS}
      renderName={(paint) => <PaintName paint={paint} />}
      baseIdOf={(paint) => paint.basePaintId}
      diffsById={diffsById}
      customisingIds={catalogue.customisingIds}
      removingIds={catalogue.removingIds}
      onCreate={() => setEditing({ mode: "create" })}
      onEdit={(paint) => setEditing({ mode: "edit", paint })}
      onDiff={setDiffTarget}
      onCustomise={handleCustomise}
      onRemove={(paint) => catalogue.handleRemove(paint.id ?? "")}
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

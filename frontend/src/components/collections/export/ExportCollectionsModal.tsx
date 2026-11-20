import { Button, Checkbox, Group, Radio, Select, Stack, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import ResponsiveModal from "@/components/ResponsiveModal";
import type { ArmyCollection, CollectionExportInclude } from "@/generated";
import useCollectionExport from "@/hooks/collections/useCollectionExport";
import {
  type ExportDetail,
  type ExportFormat,
  type ExportIncludeFlag,
  optionApplies,
} from "@/utils/collectionExport/exportOptions";
import { listTimeZoneOptions, resolveTimeDisplay } from "@/utils/collectionExport/timeZones";

export type ExportCollectionsModalProps = Readonly<{
  opened: boolean;
  onClose: () => void;
  collections: ArmyCollection[];
  initialSelectedIds?: string[];
  selectedMiniatureIds?: string[];
  showCollectionPicker: boolean;
}>;

type ExportScope = "whole" | "selected";

const DEFAULT_INCLUDE: CollectionExportInclude = {
  collectionDescription: true,
  faction: true,
  status: true,
  wargear: true,
  paintRecipes: true,
  miniatureDetails: true,
  spareBits: false,
  statusHistory: false,
  thumbnails: false,
};

const INCLUDE_OPTIONS: ReadonlyArray<{ flag: ExportIncludeFlag; label: string }> = [
  { flag: "collectionDescription", label: "Collection description" },
  { flag: "faction", label: "Faction" },
  { flag: "status", label: "Status" },
  { flag: "wargear", label: "Wargear" },
  { flag: "paintRecipes", label: "Paint recipes" },
  { flag: "miniatureDetails", label: "Miniature names and descriptions" },
  { flag: "spareBits", label: "Spare magnetised bits" },
  { flag: "statusHistory", label: "Status history" },
  { flag: "thumbnails", label: "Thumbnails" },
];

function initialScope(selectedMiniatureIds?: string[]): ExportScope {
  return selectedMiniatureIds && selectedMiniatureIds.length > 0 ? "selected" : "whole";
}

function defaultSelectedIds(collections: ArmyCollection[], initialSelectedIds?: string[]): string[] {
  if (initialSelectedIds && initialSelectedIds.length > 0) {
    return initialSelectedIds;
  }
  return collections.map((c) => c.id).filter((id): id is string => !!id);
}

function optionEnabled(
  flag: ExportIncludeFlag,
  format: ExportFormat,
  detail: ExportDetail,
  include: CollectionExportInclude,
): boolean {
  if (!optionApplies(flag, format, detail)) {
    return false;
  }
  if (flag === "spareBits" && !include.wargear) {
    return false;
  }
  if (flag === "statusHistory" && !include.status) {
    return false;
  }
  return true;
}

function optionHint(
  flag: ExportIncludeFlag,
  format: ExportFormat,
  detail: ExportDetail,
  include: CollectionExportInclude,
): string | undefined {
  if (optionEnabled(flag, format, detail, include)) {
    return undefined;
  }
  if (flag === "spareBits" && !include.wargear) {
    return "Requires wargear";
  }
  if (flag === "statusHistory" && !include.status) {
    return "Requires status";
  }
  switch (flag) {
    case "thumbnails":
      return "HTML and every miniature only";
    case "miniatureDetails":
    case "statusHistory":
      return "JSON or every miniature only";
    default:
      return undefined;
  }
}

export default function ExportCollectionsModal({
  opened,
  onClose,
  collections,
  initialSelectedIds,
  selectedMiniatureIds,
  showCollectionPicker,
}: ExportCollectionsModalProps) {
  const { exporting, progress, exportCollections } = useCollectionExport();
  const [format, setFormat] = useState<ExportFormat>("html");
  const [detail, setDetail] = useState<ExportDetail>("every");
  const [include, setInclude] = useState<CollectionExportInclude>(DEFAULT_INCLUDE);
  const [includeTimes, setIncludeTimes] = useState(false);
  const [zoneChoice, setZoneChoice] = useState("iso");
  const [scopedIds, setScopedIds] = useState<string[]>(() => [...(selectedMiniatureIds ?? [])]);
  const [scope, setScope] = useState<ExportScope>(() => initialScope(selectedMiniatureIds));
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    defaultSelectedIds(collections, initialSelectedIds),
  );
  const wasOpenedRef = useRef(false);

  // Reset only on opened false→true (or mount-open). Keep collection and selection props in
  // deps for exhaustive-deps, but ignore identity changes while the dialog stays open.
  useEffect(() => {
    const justOpened = opened && !wasOpenedRef.current;
    wasOpenedRef.current = opened;
    if (!justOpened) {
      return;
    }
    setFormat("html");
    setDetail("every");
    setInclude(DEFAULT_INCLUDE);
    setIncludeTimes(false);
    setZoneChoice("iso");
    setScopedIds([...(selectedMiniatureIds ?? [])]);
    setScope(initialScope(selectedMiniatureIds));
    setSelectedIds(defaultSelectedIds(collections, initialSelectedIds));
  }, [opened, collections, initialSelectedIds, selectedMiniatureIds]);

  const selectedCollections = collections.filter((c) => c.id && selectedIds.includes(c.id));
  const hasSelection = selectedCollections.length > 0;
  const detailDisabled = format === "json";
  const timesAvailable = !!include.status || !!include.statusHistory;
  const allSelected =
    collections.length > 0 && collections.every((c) => c.id && selectedIds.includes(c.id));

  function toggleCollection(id: string, checked: boolean) {
    setSelectedIds((current) => (checked ? [...current, id] : current.filter((x) => x !== id)));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? defaultSelectedIds(collections) : []);
  }

  function setIncludeFlag(flag: ExportIncludeFlag, checked: boolean) {
    setInclude((current) => ({ ...current, [flag]: checked }));
  }

  async function runExport(mode: "download" | "copy") {
    if (!hasSelection) {
      return;
    }
    try {
      await exportCollections({
        format,
        detail,
        include,
        collections: selectedCollections.map((c) => ({ id: c.id as string, name: c.name })),
        mode,
        time: resolveTimeDisplay(includeTimes && timesAvailable, zoneChoice),
        collectionModelIds: scope === "selected" && scopedIds.length > 0 ? scopedIds : undefined,
      });
      onClose();
    } catch {
      // API failures are notified by the interceptor; keep choices intact for retry.
    }
  }

  const footer = (
    <Group justify="flex-end">
      <Button variant="default" onClick={onClose} disabled={exporting}>
        Cancel
      </Button>
      {format === "markdown" && (
        <Button variant="light" onClick={() => void runExport("copy")} disabled={!hasSelection || exporting}>
          Copy to clipboard
        </Button>
      )}
      <Button onClick={() => void runExport("download")} disabled={!hasSelection || exporting} loading={exporting}>
        {progress ? `Download (${progress.done}/${progress.total})` : "Download"}
      </Button>
    </Group>
  );

  return (
    <ResponsiveModal opened={opened} onClose={onClose} title="Export collections" size="md" footer={footer}>
      <Stack gap="md">
        {showCollectionPicker && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Collections
            </Text>
            <Checkbox
              label="Select all"
              checked={allSelected}
              indeterminate={hasSelection && !allSelected}
              onChange={(e) => toggleSelectAll(e.currentTarget.checked)}
            />
            {collections.map((collection) =>
              collection.id ? (
                <Checkbox
                  key={collection.id}
                  label={collection.name}
                  checked={selectedIds.includes(collection.id)}
                  onChange={(e) => toggleCollection(collection.id as string, e.currentTarget.checked)}
                />
              ) : null,
            )}
          </Stack>
        )}

        <Radio.Group
          label="Format"
          value={format}
          onChange={(value) => setFormat(value as ExportFormat)}
        >
          <Group mt="xs">
            <Radio value="json" label="JSON" />
            <Radio value="html" label="HTML" />
            <Radio value="markdown" label="Markdown" />
          </Group>
        </Radio.Group>

        <Radio.Group
          label="Detail"
          description={detailDisabled ? "Not used for JSON" : undefined}
          value={detail}
          onChange={(value) => setDetail(value as ExportDetail)}
        >
          <Group mt="xs">
            <Radio value="summary" label="Summary" disabled={detailDisabled} />
            <Radio value="every" label="Every miniature" disabled={detailDisabled} />
          </Group>
        </Radio.Group>

        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Include
          </Text>
          {INCLUDE_OPTIONS.map(({ flag, label }) => {
            const enabled = optionEnabled(flag, format, detail, include);
            return (
              <Checkbox
                key={flag}
                label={label}
                description={optionHint(flag, format, detail, include)}
                checked={!!include[flag]}
                disabled={!enabled}
                onChange={(e) => setIncludeFlag(flag, e.currentTarget.checked)}
              />
            );
          })}
          <Checkbox
            label="Include times"
            description={timesAvailable ? undefined : "Requires status or status history"}
            checked={includeTimes}
            disabled={!timesAvailable}
            onChange={(e) => setIncludeTimes(e.currentTarget.checked)}
          />
          <Select
            label="Timezone"
            data={listTimeZoneOptions()}
            value={zoneChoice}
            onChange={(value) => {
              if (value) {
                setZoneChoice(value);
              }
            }}
            searchable
            allowDeselect={false}
            disabled={!includeTimes || !timesAvailable}
          />
        </Stack>
        {scopedIds.length > 0 && (
          <Radio.Group label="Scope" value={scope} onChange={(value) => setScope(value as ExportScope)}>
            <Group mt="xs">
              <Radio value="whole" label="Whole collection" />
              <Radio value="selected" label={`Only the ${scopedIds.length} selected`} />
            </Group>
          </Radio.Group>
        )}
      </Stack>
    </ResponsiveModal>
  );
}

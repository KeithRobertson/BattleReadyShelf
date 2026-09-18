import { Button, Group, Select, Stack, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import {
  paintBrandOptions,
  paintGroupIds,
  paintsInBrand,
  paintsInType,
  paintTypeOptions,
} from "@/components/mydefinitions/hidePaintsByGroup";
import type { Paint } from "@/generated";

type HidePaintsByGroupProps = Readonly<{
  paints: readonly Paint[];
  hidingIds: ReadonlySet<string>;
  onSetHidden: (ids: readonly string[], hidden: boolean) => void;
}>;

function GroupActions({
  label,
  placeholder,
  searchable,
  options,
  value,
  onChange,
  offeredIds,
  hiddenIds,
  hidingIds,
  onSetHidden,
}: Readonly<{
  label: string;
  placeholder: string;
  searchable?: boolean;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
  offeredIds: string[];
  hiddenIds: string[];
  hidingIds: ReadonlySet<string>;
  onSetHidden: (ids: readonly string[], hidden: boolean) => void;
}>) {
  const busy = [...offeredIds, ...hiddenIds].some((id) => hidingIds.has(id));

  return (
    <Group gap="xs" wrap="wrap" align="flex-end">
      <Select
        label={label}
        placeholder={placeholder}
        data={options}
        value={value}
        onChange={onChange}
        searchable={searchable}
        clearable
        w={220}
      />
      <Button
        size="compact-sm"
        variant="default"
        disabled={offeredIds.length === 0}
        loading={busy && offeredIds.length > 0}
        onClick={() => onSetHidden(offeredIds, true)}
      >
        {offeredIds.length > 0 ? `Hide ${offeredIds.length} from pickers` : "Hide from pickers"}
      </Button>
      <Button
        size="compact-sm"
        variant="subtle"
        disabled={hiddenIds.length === 0}
        loading={busy && hiddenIds.length > 0}
        onClick={() => onSetHidden(hiddenIds, false)}
      >
        {hiddenIds.length > 0 ? `Show ${hiddenIds.length}` : "Show"}
      </Button>
    </Group>
  );
}

/**
 * Hides or shows every paint of one brand or one type, including personal copies. The catalogue is
 * large enough that ticking rows is not a reasonable way to drop a range you do not own.
 */
export default function HidePaintsByGroup({ paints, hidingIds, onSetHidden }: HidePaintsByGroupProps) {
  const [brand, setBrand] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

  const brandOptions = useMemo(() => paintBrandOptions(paints), [paints]);
  const typeOptions = useMemo(() => paintTypeOptions(paints), [paints]);

  const brandPaints = brand ? paintsInBrand(paints, brand) : [];
  const typePaints = type ? paintsInType(paints, type) : [];

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Hide by brand or type
      </Text>
      <Group gap="lg" align="flex-end" wrap="wrap">
        <GroupActions
          label="Brand"
          placeholder="Choose a brand"
          searchable
          options={brandOptions}
          value={brand}
          onChange={setBrand}
          offeredIds={paintGroupIds(brandPaints, false)}
          hiddenIds={paintGroupIds(brandPaints, true)}
          hidingIds={hidingIds}
          onSetHidden={onSetHidden}
        />
        <GroupActions
          label="Type"
          placeholder="Choose a type"
          options={typeOptions}
          value={type}
          onChange={setType}
          offeredIds={paintGroupIds(typePaints, false)}
          hiddenIds={paintGroupIds(typePaints, true)}
          hidingIds={hidingIds}
          onSetHidden={onSetHidden}
        />
      </Group>
    </Stack>
  );
}

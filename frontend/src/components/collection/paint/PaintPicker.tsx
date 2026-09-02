import { Combobox, Group, Text, TextInput, useCombobox } from "@mantine/core";
import { useState } from "react";
import PaintSwatch from "@/components/paints/PaintSwatch.tsx";
import type { Paint } from "@/generated";

type PaintPickerProps = Readonly<{
  paints: Paint[];
  value: Paint | null;
  placeholder?: string;
  onChange: (paint: Paint) => void;
}>;

function describe(paint: Paint) {
  return paint.brand ? `${paint.brand} ${paint.name}` : paint.name;
}

/**
 * Picks one paint from the ones available to the signed-in user: the shared catalogue plus their own.
 *
 * Unlike the wargear picker this will not accept a name that is not in the list. A recipe stores a
 * reference to a paint rather than its name, so an unrecognised entry has nothing to point at; the
 * user is directed to My Paints to add it instead.
 *
 * The search term is held separately from the selection so that focusing the field does not wipe
 * the current choice, and the field only shows a search term once the user actually types.
 */
export default function PaintPicker({ paints, value, placeholder, onChange }: PaintPickerProps) {
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });
  const [search, setSearch] = useState<string | null>(null);

  const term = (search ?? "").trim().toLowerCase();
  const matches = term === "" ? paints : paints.filter((paint) => describe(paint).toLowerCase().includes(term));

  function handleSelect(paintId: string) {
    const picked = paints.find((paint) => paint.id === paintId);
    if (picked) onChange(picked);
    setSearch(null);
    combobox.closeDropdown();
  }

  const options = matches.map((paint) => (
    <Combobox.Option value={paint.id ?? ""} key={paint.id}>
      <Group gap="xs" wrap="nowrap">
        <PaintSwatch hexColour={paint.hexColour} label={paint.name} />
        <Text size="sm">{paint.name}</Text>
        {paint.brand && (
          <Text size="xs" c="dimmed">
            {paint.brand}
          </Text>
        )}
      </Group>
    </Combobox.Option>
  ));

  return (
    <Combobox store={combobox} withinPortal onOptionSubmit={handleSelect}>
      <Combobox.Target>
        <TextInput
          placeholder={placeholder ?? "Search paints"}
          value={search ?? (value ? describe(value) : "")}
          leftSection={value && search === null ? <PaintSwatch hexColour={value.hexColour} label={value.name} /> : null}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onChange={(event) => {
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
            setSearch(event.currentTarget.value);
          }}
          onFocus={() => combobox.openDropdown()}
          onClick={() => combobox.openDropdown()}
          onBlur={() => {
            setSearch(null);
            combobox.closeDropdown();
          }}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={240} style={{ overflowY: "auto" }}>
          {options}
          {options.length === 0 && (
            <Combobox.Empty>
              {paints.length === 0 ? "No paints yet — add some under My Paints" : "No matches"}
            </Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

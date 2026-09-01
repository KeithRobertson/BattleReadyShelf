import { Combobox, Group, InputBase, Text, useCombobox } from "@mantine/core";
import { useState } from "react";
import type { WargearDefinition } from "@/generated";

export type WargearSelection = Readonly<{
  /** Set when an existing shared definition was picked. */
  wargearDefinitionId?: string;
  name: string;
}>;

type WargearOptionPickerProps = Readonly<{
  definitions: WargearDefinition[];
  value: WargearSelection;
  onChange: (selection: WargearSelection) => void;
}>;

/**
 * Picks the shared wargear a model definition uses. Wargear is chosen from the catalogue rather
 * than typed, so two models referring to the same weapon end up pointing at the same definition
 * instead of creating a near-duplicate. Typing a name that is not in the catalogue is still
 * allowed, and creates a new definition when the draft is saved.
 */
export default function WargearOptionPicker({ definitions, value, onChange }: WargearOptionPickerProps) {
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });
  const [search, setSearch] = useState("");

  const term = search.trim().toLowerCase();
  const matches = definitions.filter(
    (definition) =>
      definition.name.toLowerCase().includes(term) || (definition.externalId?.toLowerCase().includes(term) ?? false),
  );
  const hasExactMatch = definitions.some((definition) => definition.name.toLowerCase() === term);

  function handleSelect(optionValue: string) {
    if (optionValue.startsWith("new:")) {
      onChange({ name: optionValue.slice("new:".length) });
    } else {
      const picked = definitions.find((definition) => definition.id === optionValue);
      if (picked) onChange({ wargearDefinitionId: picked.id, name: picked.name });
    }
    setSearch("");
    combobox.closeDropdown();
  }

  const options = matches.map((definition) => (
    <Combobox.Option value={definition.id ?? ""} key={definition.id}>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm">{definition.name}</Text>
        {definition.externalId != null && (
          <Text size="xs" c="dimmed" ff="monospace">
            {definition.externalId}
          </Text>
        )}
      </Group>
    </Combobox.Option>
  ));

  return (
    <Combobox store={combobox} withinPortal onOptionSubmit={handleSelect}>
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => combobox.toggleDropdown()}
        >
          {value.name === "" ? <Text c="dimmed">Select wargear</Text> : value.name}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Search wargear"
        />
        <Combobox.Options mah={260} style={{ overflowY: "auto" }}>
          {options}
          {term !== "" && !hasExactMatch && (
            <Combobox.Option value={`new:${search.trim()}`}>
              <Text size="sm">
                + Create new wargear &quot;{search.trim()}&quot;
              </Text>
            </Combobox.Option>
          )}
          {options.length === 0 && term === "" && <Combobox.Empty>No wargear definitions yet</Combobox.Empty>}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

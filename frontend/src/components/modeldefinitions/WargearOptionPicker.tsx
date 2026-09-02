import { Combobox, Text, TextInput, useCombobox } from "@mantine/core";
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

  const term = value.name.trim().toLowerCase();
  const showAll = value.wargearDefinitionId != null || term === "";
  const matches = showAll ? definitions : definitions.filter((d) => d.name.toLowerCase().includes(term));
  const isUnknownName = term !== "" && !definitions.some((d) => d.name.toLowerCase() === term);

  function handleSelect(definitionId: string) {
    const picked = definitions.find((definition) => definition.id === definitionId);
    if (picked) onChange({ wargearDefinitionId: picked.id, name: picked.name });
    combobox.closeDropdown();
  }

  const options = matches.map((definition) => (
    <Combobox.Option value={definition.id ?? ""} key={definition.id}>
      <Text size="sm">{definition.name}</Text>
    </Combobox.Option>
  ));

  return (
    <Combobox store={combobox} withinPortal onOptionSubmit={handleSelect}>
      <Combobox.Target>
        <TextInput
          placeholder="Select or type wargear"
          value={value.name}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onChange={(event) => {
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
            onChange({ name: event.currentTarget.value });
          }}
          onFocus={() => combobox.openDropdown()}
          onClick={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={260} style={{ overflowY: "auto" }}>
          {options}
          {options.length === 0 && (
            <Combobox.Empty>{definitions.length === 0 ? "No wargear definitions yet" : "No matches"}</Combobox.Empty>
          )}
        </Combobox.Options>
        {isUnknownName && (
          <Combobox.Footer>
            <Text size="xs" c="dimmed">
              &quot;{value.name.trim()}&quot; is not in the catalogue yet — it will be created when you save.
            </Text>
          </Combobox.Footer>
        )}
      </Combobox.Dropdown>
    </Combobox>
  );
}

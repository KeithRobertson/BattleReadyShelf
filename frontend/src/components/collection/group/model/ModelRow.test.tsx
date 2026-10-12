import { MantineProvider, Table } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ModelRow } from "@/components/collection/group/model/ModelRow.tsx";
import type { CollectionModel } from "@/generated";

const model: CollectionModel = {
  id: "model-1",
  modelDefinitionId: "plague-marine",
  name: "Champion",
  status: "PAINTED",
  finishedOn: "2024-03-01",
  modelDefinition: {
    id: "plague-marine",
    name: "Plague Marine",
    attachmentSlots: [{ id: "arm", name: "Arm", type: "arm" }],
    wargearOptions: [{ id: "flail", name: "Flail", isDefault: false, attachmentSlotIds: ["arm"] }],
  },
  wargearSelections: [{ attachmentSlotId: "arm", wargearOptionId: "flail" }],
};

function renderRow(props: Partial<ComponentProps<typeof ModelRow>> = {}) {
  const onToggleFocus = vi.fn();
  const onToggleSelected = vi.fn();
  render(
    <MantineProvider>
      <Table>
        <Table.Tbody>
          <ModelRow
            model={model}
            editMode
            selected={false}
            focused={false}
            recipe={null}
            onToggleFocus={onToggleFocus}
            onToggleSelected={onToggleSelected}
            {...props}
          />
        </Table.Tbody>
      </Table>
    </MantineProvider>,
  );
  return { onToggleFocus, onToggleSelected };
}

describe("ModelRow", () => {
  it("focuses the model when the row is clicked", () => {
    const { onToggleFocus } = renderRow();

    fireEvent.click(screen.getByText("Champion"));

    expect(onToggleFocus).toHaveBeenCalledOnce();
  });

  it("selects the model without focusing it when the checkbox is clicked", () => {
    const { onToggleFocus, onToggleSelected } = renderRow();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Champion" }));

    expect(onToggleSelected).toHaveBeenCalledWith(true);
    expect(onToggleFocus).not.toHaveBeenCalled();
  });

  it("shows the status and loadout", () => {
    renderRow({ editMode: false });

    expect(screen.getAllByText("Painted").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Arm: Flail").length).toBeGreaterThan(0);
  });
});

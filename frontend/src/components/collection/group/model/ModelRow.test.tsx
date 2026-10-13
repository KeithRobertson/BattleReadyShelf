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
  statusChangedAt: "2024-03-01T15:04:00Z",
  statusHistory: [
    { status: "PAINTED", changedAt: "2024-03-01T15:04:00Z" },
    { status: "PAINTING", changedAt: "2024-02-01T09:00:00Z" },
  ],
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

function mockLoadoutWidths(): () => void {
  const offset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  const client = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      if (this instanceof HTMLElement && this.dataset.loadoutChip != null) return 80;
      if (this instanceof HTMLElement && this.dataset.loadoutMore != null) return 36;
      return offset?.get?.call(this) ?? 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      if (this instanceof HTMLElement && this.dataset.loadoutRow != null) return 150;
      return client?.get?.call(this) ?? 0;
    },
  });
  return () => {
    if (offset) Object.defineProperty(HTMLElement.prototype, "offsetWidth", offset);
    if (client) Object.defineProperty(HTMLElement.prototype, "clientWidth", client);
  };
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

  it("collapses loadout chips that do not fit, without focusing the row", () => {
    const restore = mockLoadoutWidths();
    try {
      const { onToggleFocus } = renderRow({
        editMode: false,
        model: {
          ...model,
          modelDefinition: {
            id: "plague-marine",
            name: "Plague Marine",
            attachmentSlots: [
              { id: "arm", name: "Arm", type: "arm" },
              { id: "gun", name: "Gun", type: "weapon" },
              { id: "hull", name: "Hull", type: "hull" },
            ],
            wargearOptions: [
              { id: "flail", name: "Flail", isDefault: false, attachmentSlotIds: ["arm"] },
              { id: "bolter", name: "Bolter", isDefault: false, attachmentSlotIds: ["gun"] },
              { id: "dozer", name: "Dozer blade", isDefault: false, attachmentSlotIds: ["hull"] },
            ],
          },
          wargearSelections: [
            { attachmentSlotId: "arm", wargearOptionId: "flail" },
            { attachmentSlotId: "gun", wargearOptionId: "bolter" },
            { attachmentSlotId: "hull", wargearOptionId: "dozer" },
          ],
        },
      });

      const shown = () => document.querySelector("[data-loadout-row]")?.firstElementChild?.textContent ?? "";
      expect(shown()).not.toContain("Gun: Bolter");
      fireEvent.click(screen.getAllByRole("button", { name: "Show 2 more loadout items" })[0]);

      expect(shown()).toContain("Gun: Bolter");
      expect(shown()).toContain("Hull: Dozer blade");
      expect(onToggleFocus).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it("expands earlier status changes", () => {
    renderRow({ editMode: false });

    fireEvent.click(screen.getAllByRole("button", { name: "1 Mar 2024, 15:04 UTC" })[0]);

    expect(screen.getAllByText("Painting · 1 Feb 2024, 09:00 UTC").length).toBeGreaterThan(0);
  });
});

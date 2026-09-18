import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CollectionAsideSummary } from "@/components/collection/aside/CollectionAsideSummary.tsx";
import type { CollectionModel } from "@/generated";
import { normalizeWargearName } from "@/utils/collection/wargearNamesOnModel.ts";

const flail = "Flail of Corruption";

function plagueMarine(wargearName: string): CollectionModel {
  return {
    id: "model-1",
    modelDefinitionId: "plague-marine",
    status: "PAINTED",
    modelDefinition: {
      id: "plague-marine",
      name: "Plague Marine",
      attachmentSlots: [],
      wargearOptions: [{ id: "flail", name: wargearName, isDefault: false, attachmentSlotIds: [] }],
    },
    wargearSelections: [{ attachmentSlotId: "left-arm", wargearOptionId: "flail" }],
  };
}

describe("CollectionAsideSummary", () => {
  it("sets the wargear filter to the clicked option", () => {
    const setWargearFilter = vi.fn();
    render(
      <MantineProvider>
        <CollectionAsideSummary
          collectionName="Death Guard"
          models={[plagueMarine(flail)]}
          recipes={[]}
          modelDefinitionOrder={["plague-marine"]}
          filters={{
            statusFilter: [],
            setStatusFilter: vi.fn(),
            typeFilter: [],
            setTypeFilter: vi.fn(),
            paintFilter: [],
            setPaintFilter: vi.fn(),
            wargearFilter: [],
            setWargearFilter,
          }}
        />
      </MantineProvider>,
    );

    fireEvent.click(screen.getByTitle(`Filter by ${flail}`));
    expect(setWargearFilter).toHaveBeenCalledWith([normalizeWargearName(flail)]);
  });

  it("sets the type filter to the clicked model type", () => {
    const setTypeFilter = vi.fn();
    render(
      <MantineProvider>
        <CollectionAsideSummary
          collectionName="Death Guard"
          models={[plagueMarine(flail)]}
          recipes={[]}
          modelDefinitionOrder={["plague-marine"]}
          filters={{
            statusFilter: [],
            setStatusFilter: vi.fn(),
            typeFilter: [],
            setTypeFilter,
            paintFilter: [],
            setPaintFilter: vi.fn(),
            wargearFilter: [],
            setWargearFilter: vi.fn(),
          }}
        />
      </MantineProvider>,
    );

    fireEvent.click(screen.getByTitle("Filter by Plague Marine"));
    expect(setTypeFilter).toHaveBeenCalledWith(["plague-marine"]);
  });
});

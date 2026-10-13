import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CollectionModelInspector,
  type ModelInspectorEditing,
} from "@/components/collection/aside/CollectionModelInspector.tsx";
import type { CollectionModel } from "@/generated";

const model: CollectionModel = {
  id: "model-1",
  modelDefinitionId: "plague-marine",
  name: "Champion",
  status: "PAINTED",
  description: "Converted banner",
  modelDefinition: {
    id: "plague-marine",
    name: "Plague Marine",
    attachmentSlots: [],
    wargearOptions: [],
  },
};

function editing(overrides: Partial<ModelInspectorEditing> = {}): ModelInspectorEditing {
  return {
    modelDefinitionSelectData: [],
    isUploading: false,
    deletingImageId: null,
    isDeleting: false,
    recipe: null,
    paints: [],
    savingPaints: false,
    armyCollectionId: "collection-1",
    onRename: vi.fn(),
    onDeleteModel: vi.fn(),
    onUpdateDescription: vi.fn(),
    onUpdateWargearSelection: vi.fn(),
    onUpdateAlternateIdentities: vi.fn(),
    onUpdateStatus: vi.fn(),
    onRecordStatusChange: vi.fn(),
    recordingStatusChange: false,
    onDeleteStatusEvent: vi.fn(),
    deletingStatusEventId: null,
    onChangeModelDefinition: vi.fn(),
    onUploadImage: vi.fn(),
    onDeleteImage: vi.fn(),
    onSavePaintRecipe: vi.fn(),
    ...overrides,
  };
}

function renderInspector(editor?: ModelInspectorEditing) {
  render(
    <MantineProvider>
      <CollectionModelInspector model={model} recipes={[]} onBack={vi.fn()} editing={editor} />
    </MantineProvider>,
  );
}

describe("CollectionModelInspector", () => {
  it("shows the miniature without edit controls in view mode", () => {
    renderInspector();

    expect(screen.getByText("Champion")).toBeTruthy();
    expect(screen.getByText("Converted banner")).toBeTruthy();
    expect(screen.queryByLabelText("Finished")).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit model" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add to history" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete model" })).toBeNull();
    expect(screen.queryByLabelText("Status")).toBeNull();
  });

  it("edits the focused miniature from the aside, and done returns the summary", () => {
    renderInspector(editing());

    expect(screen.getByRole("heading", { name: "Champion" })).toBeTruthy();
    expect(screen.queryByLabelText("Name")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit model" }));

    expect(screen.getByLabelText("Name")).toHaveProperty("value", "Champion");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveProperty("value", "Painted");
    expect(screen.getByLabelText("Description")).toHaveProperty("value", "Converted banner");
    expect(screen.getByRole("button", { name: "Delete model" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add photo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
    expect(screen.getByRole("button", { name: "Add to history" })).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: "Done editing model" }));

    expect(screen.getByRole("heading", { name: "Champion" })).toBeTruthy();
    expect(screen.queryByLabelText("Name")).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete model" })).toBeNull();
  });

  it("removes a status change from the timeline, but not the only one", () => {
    const onDeleteStatusEvent = vi.fn();
    const withHistory: CollectionModel = {
      ...model,
      statusChangedAt: "2024-03-01T15:04:00Z",
      statusHistory: [
        { id: "event-new", status: "PAINTED", changedAt: "2024-03-01T15:04:00Z" },
        { id: "event-old", status: "PAINTING", changedAt: "2024-02-01T09:00:00Z" },
      ],
    };
    const { rerender } = render(
      <MantineProvider>
        <CollectionModelInspector
          model={withHistory}
          recipes={[]}
          onBack={vi.fn()}
          editing={editing({ onDeleteStatusEvent })}
        />
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit model" }));
    fireEvent.click(screen.getByRole("button", { name: "1 Mar 2024, 15:04 UTC" }));
    fireEvent.click(screen.getByRole("button", { name: /Remove Painting/ }));

    expect(onDeleteStatusEvent).toHaveBeenCalledWith("event-old");

    rerender(
      <MantineProvider>
        <CollectionModelInspector
          model={{
            ...withHistory,
            statusHistory: [{ id: "event-new", status: "PAINTED", changedAt: "2024-03-01T15:04:00Z" }],
          }}
          recipes={[]}
          onBack={vi.fn()}
          editing={editing({ onDeleteStatusEvent })}
        />
      </MantineProvider>,
    );

    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
  });
});

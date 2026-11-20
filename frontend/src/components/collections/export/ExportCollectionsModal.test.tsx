import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExportCollectionsModal from "@/components/collections/export/ExportCollectionsModal";
import type { ArmyCollection } from "@/generated";
import { resetApiStubs, type StubbedRequest, stubApi } from "@/testing/stubApi";
import { makeExportDoc } from "@/utils/collectionExport/exportFixture";

vi.mock("@/utils/downloadFile", () => ({
  default: vi.fn(),
}));

vi.mock("@/utils/showErrorNotification", () => ({
  default: vi.fn(),
}));

import downloadFile from "@/utils/downloadFile";

const collections: ArmyCollection[] = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Death Guard" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Orks" },
];

function exportRequest(requests: StubbedRequest[]): StubbedRequest | undefined {
  return requests.find((request) => request.url.includes("/army-collections/export"));
}

function renderModal(props: Partial<ComponentProps<typeof ExportCollectionsModal>> = {}) {
  return render(
    <MantineProvider>
      <ExportCollectionsModal
        opened
        onClose={vi.fn()}
        collections={collections}
        showCollectionPicker
        {...props}
      />
    </MantineProvider>,
  );
}

describe("ExportCollectionsModal", () => {
  beforeEach(() => {
    vi.mocked(downloadFile).mockReset();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    resetApiStubs();
  });

  it("opens on HTML with every miniature selected", () => {
    renderModal();

    expect((screen.getByRole("radio", { name: "HTML" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "Every miniature" }) as HTMLInputElement).checked).toBe(true);
  });

  it("disables detail and thumbnails when format is JSON", () => {
    renderModal();

    fireEvent.click(screen.getByRole("radio", { name: "JSON" }));

    expect((screen.getByRole("radio", { name: "Summary" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("radio", { name: "Every miniature" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("checkbox", { name: /Thumbnails/i }) as HTMLInputElement).disabled).toBe(true);
  });

  it("keeps Include times unchecked and disabled until status is on", () => {
    renderModal();

    fireEvent.click(screen.getByRole("checkbox", { name: /^Status$/i }));

    const includeTimes = screen.getByRole("checkbox", { name: /Include times/i }) as HTMLInputElement;
    expect(includeTimes.checked).toBe(false);
    expect(includeTimes.disabled).toBe(true);
    expect(screen.getByText("Requires status or status history")).toBeTruthy();

    fireEvent.click(screen.getByRole("checkbox", { name: /^Status$/i }));

    expect(includeTimes.disabled).toBe(false);
    expect(includeTimes.checked).toBe(false);
    expect((screen.getByRole("combobox", { name: "Timezone" }) as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(includeTimes);

    expect((screen.getByRole("combobox", { name: "Timezone" }) as HTMLInputElement).disabled).toBe(false);
  });

  it("downloads only the selected miniatures when that scope is chosen", async () => {
    const requests = stubApi({
      "/army-collections/export": { status: 200, body: makeExportDoc() },
    });
    renderModal({ selectedMiniatureIds: ["m1"] });

    expect((screen.getByRole("radio", { name: "Only the 1 selected" }) as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => {
      expect(exportRequest(requests)?.body).toMatchObject({ collectionModelIds: ["m1"] });
    });
  });

  it.each<[string, string[] | undefined]>([
    ["omitted", undefined],
    ["empty", []],
  ])(
    "omits miniature scope and collectionModelIds when selected ids are %s",
    async (_label, selectedMiniatureIds) => {
      const requests = stubApi({
        "/army-collections/export": { status: 200, body: makeExportDoc() },
      });
      renderModal({ selectedMiniatureIds });

      expect(screen.queryByRole("radio", { name: /Only the \d+ selected/ })).toBeNull();
      expect(screen.queryByRole("radio", { name: "Whole collection" })).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "Download" }));

      await waitFor(() => {
        const body = exportRequest(requests)?.body;
        expect(body).toEqual(expect.objectContaining({ armyCollectionIds: expect.any(Array) }));
        expect(body).not.toHaveProperty("collectionModelIds");
      });
    },
  );

  it("omits collectionModelIds when Whole collection is chosen", async () => {
    const requests = stubApi({
      "/army-collections/export": { status: 200, body: makeExportDoc() },
    });
    renderModal({ selectedMiniatureIds: ["m1", "m2"] });

    fireEvent.click(screen.getByRole("radio", { name: "Whole collection" }));
    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => {
      const body = exportRequest(requests)?.body;
      expect(body).toEqual(expect.objectContaining({ armyCollectionIds: expect.any(Array) }));
      expect(body).not.toHaveProperty("collectionModelIds");
    });
  });

  it("enables thumbnails when format is HTML and detail is Every miniature", () => {
    renderModal();

    fireEvent.click(screen.getByRole("radio", { name: "HTML" }));
    fireEvent.click(screen.getByRole("radio", { name: "Every miniature" }));

    expect((screen.getByRole("checkbox", { name: /Thumbnails/i }) as HTMLInputElement).disabled).toBe(false);
  });

  it("disables spare bits when wargear is turned off", () => {
    renderModal();

    const spareBits = screen.getByRole("checkbox", { name: /Spare magnetised bits/i }) as HTMLInputElement;
    expect(spareBits.disabled).toBe(false);

    fireEvent.click(screen.getByRole("checkbox", { name: /^Wargear$/i }));

    expect(spareBits.disabled).toBe(true);
  });

  it("disables Download when no collections are ticked in multi mode", () => {
    renderModal({ showCollectionPicker: true });

    fireEvent.click(screen.getByRole("checkbox", { name: "Death Guard" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Orks" }));

    expect((screen.getByRole("button", { name: "Download" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the dialog open when the export API returns 500", async () => {
    stubApi({ "/army-collections/export": { status: 500, body: { message: "boom" } } });
    renderModal({ showCollectionPicker: true });

    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
      expect((screen.getByRole("button", { name: "Download" }) as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it("keeps the dialog open when downloadFile fails", async () => {
    stubApi({
      "/army-collections/export": {
        status: 200,
        body: makeExportDoc(),
      },
    });
    vi.mocked(downloadFile).mockImplementation(() => {
      throw new Error("save failed");
    });
    const onClose = vi.fn();
    renderModal({ showCollectionPicker: true, onClose });

    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => {
      expect(downloadFile).toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeTruthy();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it("does not wipe choices when collections array identity changes while open", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <MantineProvider>
        <ExportCollectionsModal
          opened
          onClose={onClose}
          collections={collections}
          showCollectionPicker
        />
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("radio", { name: "HTML" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Orks" }));

    rerender(
      <MantineProvider>
        <ExportCollectionsModal
          opened
          onClose={onClose}
          collections={[...collections]}
          initialSelectedIds={
            collections[0]?.id ? [collections[0].id] : undefined
          }
          showCollectionPicker
        />
      </MantineProvider>,
    );

    expect((screen.getByRole("radio", { name: "HTML" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Orks" }) as HTMLInputElement).checked).toBe(false);
  });

  it("resets choices when the dialog reopens", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <MantineProvider>
        <ExportCollectionsModal
          opened
          onClose={onClose}
          collections={collections}
          showCollectionPicker
        />
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Markdown" }));
    fireEvent.click(screen.getByRole("radio", { name: "Summary" }));

    rerender(
      <MantineProvider>
        <ExportCollectionsModal
          opened={false}
          onClose={onClose}
          collections={collections}
          showCollectionPicker
        />
      </MantineProvider>,
    );
    rerender(
      <MantineProvider>
        <ExportCollectionsModal
          opened
          onClose={onClose}
          collections={collections}
          showCollectionPicker
        />
      </MantineProvider>,
    );

    expect((screen.getByRole("radio", { name: "HTML" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "Every miniature" }) as HTMLInputElement).checked).toBe(true);
  });

  it("does not reset include times or scope when props change identity while open", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <MantineProvider>
        <ExportCollectionsModal
          opened
          onClose={onClose}
          collections={collections}
          showCollectionPicker
          selectedMiniatureIds={["m1"]}
        />
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Include times/i }));
    fireEvent.click(screen.getByRole("radio", { name: "Whole collection" }));

    rerender(
      <MantineProvider>
        <ExportCollectionsModal
          opened
          onClose={onClose}
          collections={[...collections]}
          showCollectionPicker
          selectedMiniatureIds={["a", "b"]}
        />
      </MantineProvider>,
    );

    expect((screen.getByRole("checkbox", { name: /Include times/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "Whole collection" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("radio", { name: "Only the 1 selected" })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Only the 2 selected" })).toBeNull();
  });
});

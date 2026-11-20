import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExportCollectionsModal from "@/components/collections/export/ExportCollectionsModal";
import type { ArmyCollection } from "@/generated";
import { resetApiStubs, stubApi } from "@/testing/stubApi";
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

  it("defaults to JSON with detail and thumbnails disabled", () => {
    renderModal();

    expect((screen.getByRole("radio", { name: "JSON" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "Summary" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("radio", { name: "Every miniature" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("checkbox", { name: /Thumbnails/i }) as HTMLInputElement).disabled).toBe(true);
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

    fireEvent.click(screen.getByRole("radio", { name: "HTML" }));

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

    expect((screen.getByRole("radio", { name: "JSON" }) as HTMLInputElement).checked).toBe(true);
  });
});

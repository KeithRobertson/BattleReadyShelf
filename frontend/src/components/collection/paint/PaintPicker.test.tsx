import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PaintPicker from "@/components/collection/paint/PaintPicker.tsx";
import type { Paint } from "@/generated";

const paints: Paint[] = Array.from({ length: 40 }, (_, index) => ({
  id: `paint-${index}`,
  name: `Paint ${index}`,
}));

describe("PaintPicker", () => {
  it("keeps the catalogue out of the page until the field is opened", () => {
    render(
      <MantineProvider>
        <PaintPicker paints={paints} value={null} onChange={vi.fn()} />
      </MantineProvider>,
    );

    expect(screen.queryByRole("option", { name: /Paint 0/ })).toBeNull();

    fireEvent.focus(screen.getByPlaceholderText("Search paints"));

    expect(screen.getByRole("option", { name: /Paint 0/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Paint 39/ })).toBeTruthy();
  });
});

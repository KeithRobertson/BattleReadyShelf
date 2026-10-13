import { describe, expect, it } from "vitest";
import { fitLoadout } from "@/utils/collection/fitLoadout.ts";

describe("fitLoadout", () => {
  it("shows every chip when the line is wide enough", () => {
    expect(fitLoadout([40, 40, 40], 200, 30, 4)).toEqual({ visibleCount: 3, truncateFirst: false });
  });

  it("reserves room for the overflow chip", () => {
    expect(fitLoadout([80, 80, 80], 150, 36, 4)).toEqual({ visibleCount: 1, truncateFirst: false });
  });

  it("keeps one chip and truncates it when nothing fits whole", () => {
    expect(fitLoadout([200, 80], 150, 36, 4)).toEqual({ visibleCount: 1, truncateFirst: true });
  });

  it("shows everything before the line has a width", () => {
    expect(fitLoadout([80, 80], 0, 36, 4)).toEqual({ visibleCount: 2, truncateFirst: false });
  });
});

import { describe, expect, it } from "vitest";
import defaultOccupancySlotIds from "@/utils/modeldefinitions/defaultOccupancySlotIds.ts";

describe("defaultOccupancySlotIds", () => {
  it("is empty when the option is not a default", () => {
    expect(defaultOccupancySlotIds({ isDefault: false, attachmentSlotIds: ["left"] })).toEqual([]);
  });

  it("falls back to every eligible slot when default slots are omitted", () => {
    expect(defaultOccupancySlotIds({ isDefault: true, attachmentSlotIds: ["left", "right"] })).toEqual([
      "left",
      "right",
    ]);
  });

  it("uses the specified default slots, ignoring ineligible ones", () => {
    expect(
      defaultOccupancySlotIds({
        isDefault: true,
        attachmentSlotIds: ["left", "right"],
        defaultAttachmentSlotIds: ["right", "head"],
      }),
    ).toEqual(["right"]);
  });
});

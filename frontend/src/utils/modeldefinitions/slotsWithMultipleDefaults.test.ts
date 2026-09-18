import { describe, expect, it } from "vitest";
import slotsWithMultipleDefaults from "@/utils/modeldefinitions/slotsWithMultipleDefaults.ts";

const left = { id: "left", name: "Left Arm" };
const right = { id: "right", name: "Right Arm" };

describe("slotsWithMultipleDefaults", () => {
  it("returns nothing when each slot has at most one default", () => {
    expect(
      slotsWithMultipleDefaults(
        [left, right],
        [
          { isDefault: true, attachmentSlotIds: [left.id] },
          { isDefault: true, attachmentSlotIds: [right.id] },
          { isDefault: false, attachmentSlotIds: [left.id, right.id] },
        ],
      ),
    ).toEqual([]);
  });

  it("names slots claimed by more than one default", () => {
    expect(
      slotsWithMultipleDefaults(
        [left, right],
        [
          { isDefault: true, attachmentSlotIds: [left.id, right.id] },
          { isDefault: true, attachmentSlotIds: [left.id, right.id] },
        ],
      ),
    ).toEqual(["Left Arm", "Right Arm"]);
  });

  it("treats no defaults as fine", () => {
    expect(slotsWithMultipleDefaults([left], [{ isDefault: false, attachmentSlotIds: [left.id] }])).toEqual([]);
  });
});

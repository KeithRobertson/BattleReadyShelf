import { describe, expect, it } from "vitest";
import exclusiveFilterValue from "@/utils/collection/exclusiveFilterValue.ts";

describe("exclusiveFilterValue", () => {
  it("sets the filter to the clicked value", () => {
    expect(exclusiveFilterValue([], "flail of corruption")).toEqual(["flail of corruption"]);
    expect(exclusiveFilterValue(["plasma gun"], "flail of corruption")).toEqual(["flail of corruption"]);
  });

  it("clears the filter when the same sole value is clicked again", () => {
    expect(exclusiveFilterValue(["flail of corruption"], "flail of corruption")).toEqual([]);
  });
});

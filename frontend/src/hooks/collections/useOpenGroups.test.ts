import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import useOpenGroups from "@/hooks/collections/useOpenGroups.ts";

describe("useOpenGroups", () => {
  it("opens every group on first load, and a group that appears later", () => {
    const { result, rerender } = renderHook(({ collectionId, groupKeys }) => useOpenGroups(collectionId, groupKeys), {
      initialProps: { collectionId: "collection-a", groupKeys: [] as string[] },
    });

    expect(result.current.openGroups).toEqual([]);

    rerender({ collectionId: "collection-a", groupKeys: ["poxwalker", "plague-marine"] });
    expect(result.current.openGroups).toEqual(["poxwalker", "plague-marine"]);

    act(() => result.current.setOpenGroups(["plague-marine"]));
    rerender({ collectionId: "collection-a", groupKeys: ["poxwalker", "plague-marine", "blightlord"] });

    expect(result.current.openGroups).toEqual(["plague-marine", "blightlord"]);
  });

  it("opens the groups of a collection you switch to", () => {
    const { result, rerender } = renderHook(({ collectionId, groupKeys }) => useOpenGroups(collectionId, groupKeys), {
      initialProps: { collectionId: "collection-a", groupKeys: ["poxwalker"] },
    });

    act(() => result.current.setOpenGroups([]));
    rerender({ collectionId: "collection-b", groupKeys: ["poxwalker", "cultist"] });

    expect(result.current.openGroups).toEqual(["poxwalker", "cultist"]);
  });
});

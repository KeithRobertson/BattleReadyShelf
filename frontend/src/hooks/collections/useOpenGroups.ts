import { useState } from "react";

type TrackedGroups = {
  collectionId: string | undefined;
  revealed: string[];
};

/**
 * Accordion groups start open. A group the user collapses stays collapsed; one that appears later
 * (the first load, or a new type) starts open. Switching collection forgets that and opens the new
 * collection's groups. Adjusted during render so the first paint is expanded, rather than flashing
 * closed until an effect runs.
 */
export default function useOpenGroups(collectionId: string | undefined, groupKeys: string[]) {
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [tracked, setTracked] = useState<TrackedGroups>({ collectionId, revealed: [] });

  if (tracked.collectionId !== collectionId) {
    setTracked({ collectionId, revealed: groupKeys });
    if (groupKeys.length > 0 || openGroups.length > 0) setOpenGroups(groupKeys);
  } else {
    const unseenGroupKeys = groupKeys.filter((key) => !tracked.revealed.includes(key));
    if (unseenGroupKeys.length > 0) {
      setTracked({ collectionId, revealed: [...tracked.revealed, ...unseenGroupKeys] });
      setOpenGroups((current) => [...current, ...unseenGroupKeys]);
    }
  }

  return { openGroups, setOpenGroups };
}

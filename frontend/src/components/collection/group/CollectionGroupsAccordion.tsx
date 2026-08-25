import { Accordion } from "@mantine/core";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import { CollectionGroup } from "@/components/collection/group/CollectionGroup.tsx";
import SortableAccordionGroup from "@/hooks/collections/models/SortableAccordionGroup.tsx";

export function CollectionGroupsAccordion() {
  const { groupedModels, openGroups, setOpenGroups } = useCollectionContext();
  return (
    <Accordion multiple value={openGroups} onChange={setOpenGroups} defaultValue={[]} variant="separated">
      {groupedModels.groupedModels.map((group) => (
        <SortableAccordionGroup key={group.key} group={group}>
          {(dragProps) => <CollectionGroup group={group} dragProps={dragProps} />}
        </SortableAccordionGroup>
      ))}
    </Accordion>
  );
}

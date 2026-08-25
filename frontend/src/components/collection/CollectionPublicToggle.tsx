import { SegmentedControl } from "@mantine/core";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";

export default function CollectionPublicToggle() {
  const { collection, isEditMode, setIsEditMode } = useCollectionContext();
  return (
    collection.isOwner && (
      <SegmentedControl
        value={isEditMode ? "edit" : "view"}
        onChange={(value) => setIsEditMode(value === "edit")}
        data={[
          { label: "View", value: "view" },
          { label: "Edit", value: "edit" },
        ]}
        size="xs"
        w={160}
      />
    )
  );
}

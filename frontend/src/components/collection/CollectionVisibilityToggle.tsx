import { Badge, Switch } from "@mantine/core";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";

export function CollectionVisibilityToggle() {
  const { collection, editing } = useCollectionContext();
  if (collection.isOwner) {
    return (
      <Switch
        label={collection.collection?.isPublic ? "Public" : "Private"}
        checked={!!collection.collection?.isPublic}
        disabled={editing.savingVisibility}
        onChange={(e) => editing.toggleVisibility(e.currentTarget.checked)}
        size="sm"
      />
    );
  }

  return (
    <Badge variant="light" color={collection.collection?.isPublic ? "blue" : "gray"} size="sm">
      {collection.collection?.isPublic ? "Public" : "Private"}
    </Badge>
  );
}

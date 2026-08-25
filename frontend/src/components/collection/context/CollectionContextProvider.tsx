import { useMemo } from "react";
import type { CollectionModelStatus } from "@/generated";
import type { CollectionHook } from "@/hooks/collections/useCollection.ts";
import type { CollectionEditing } from "@/hooks/collections/useCollectionEditing.ts";
import type { CollectionModels } from "@/hooks/collections/useCollectionModels.ts";
import type { ModelDeletion } from "@/hooks/collections/useDeleteConfirmation.ts";
import type { GroupDrag } from "@/hooks/collections/useGroupDrag.ts";
import type { GroupedModels } from "@/hooks/collections/useGroupedModels.ts";
import type { ModelImages } from "@/hooks/collections/useModelImages.ts";
import type { ModelSelection } from "@/hooks/collections/useModelSelection.ts";
import type { ModelSort } from "@/hooks/collections/useModelSort.ts";
import { CollectionContext } from "./CollectionContext";

export function CollectionContextProvider({
  children,
  collection,
  editing,
  groupedModels,
  selection,
  deletion,
  drag,
  modelImages,
  collectionModels,
  modelSort,
  isEditMode,
  setIsEditMode,
  statusFilter,
  openGroups,
  setOpenGroups,
}: Readonly<{
  children: React.ReactNode;
  collection: CollectionHook;
  editing: CollectionEditing;
  groupedModels: GroupedModels;
  selection: ModelSelection;
  deletion: ModelDeletion;
  drag: GroupDrag;
  modelImages: ModelImages;
  collectionModels: CollectionModels;
  modelSort: ModelSort;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
  statusFilter: CollectionModelStatus[];
  openGroups: string[];
  setOpenGroups: (openGroups: string[]) => void;
}>) {
  const value = useMemo(
    () => ({
      collection,
      editing,
      groupedModels,
      selection,
      deletion,
      drag,
      modelImages,
      collectionModels,
      modelSort,
      isEditMode,
      setIsEditMode,
      statusFilter,
      openGroups,
      setOpenGroups,
    }),
    [
      collection,
      editing,
      groupedModels,
      selection,
      deletion,
      drag,
      modelImages,
      collectionModels,
      modelSort,
      isEditMode,
      setIsEditMode,
      statusFilter,
      openGroups,
      setOpenGroups,
    ],
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

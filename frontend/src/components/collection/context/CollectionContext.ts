import { createContext, useContext } from "react";
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
import type { PaintRecipes } from "@/hooks/collections/usePaintRecipes.ts";

export interface CollectionContextValue {
  collection: CollectionHook;
  editing: CollectionEditing;
  groupedModels: GroupedModels;
  selection: ModelSelection;
  deletion: ModelDeletion;
  drag: GroupDrag;
  modelImages: ModelImages;
  collectionModels: CollectionModels;
  modelSort: ModelSort;
  paintRecipes: PaintRecipes;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
  statusFilter: CollectionModelStatus[];
  openGroups: string[];
  setOpenGroups: (openGroups: string[]) => void;
}

export const CollectionContext = createContext<CollectionContextValue | null>(null);

export function useCollectionContext() {
  const context = useContext(CollectionContext);
  if (!context) {
    throw new Error("useCollectionContext must be used inside CollectionContextProvider");
  }
  return context;
}

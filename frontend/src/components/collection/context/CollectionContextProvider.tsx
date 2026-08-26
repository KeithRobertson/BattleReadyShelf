import { useMemo } from "react";
import { CollectionContext, type CollectionContextValue } from "./CollectionContext";

export type CollectionContextProviderProps = Readonly<{ children: React.ReactNode } & CollectionContextValue>;

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
}: CollectionContextProviderProps) {
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

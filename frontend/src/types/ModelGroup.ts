import type { CollectionModel } from "@/generated";

export type ModelGroup = {
  key: string;
  label: string;
  models: CollectionModel[];
};

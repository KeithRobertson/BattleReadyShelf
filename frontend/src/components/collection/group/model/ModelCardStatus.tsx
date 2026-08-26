import { Badge, Loader, Select } from "@mantine/core";
import React from "react";
import type { CollectionModel, CollectionModelStatus } from "@/generated";
import {
  COLLECTION_MODEL_STATUS_COLORS,
  COLLECTION_MODEL_STATUS_LABELS,
  COLLECTION_MODEL_STATUS_OPTIONS,
} from "@/utils/collectionModelStatus.ts";

export type ModelCardStatusProps = Readonly<{
  model: CollectionModel;
  editMode: boolean;
  isUpdatingStatus: boolean;
  commitStatus: (status: CollectionModelStatus) => void;
}>;

export const ModelCardStatus = React.memo(function ModelCardStatus({
  model,
  editMode,
  isUpdatingStatus,
  commitStatus,
}: ModelCardStatusProps) {
  return editMode ? (
    <Select
      size="xs"
      data={COLLECTION_MODEL_STATUS_OPTIONS}
      value={model.status ?? null}
      onChange={(value) => value && commitStatus(value)}
      allowDeselect={false}
      disabled={isUpdatingStatus}
      rightSection={isUpdatingStatus ? <Loader size={12} /> : undefined}
      style={{ width: "100%" }}
    />
  ) : (
    <Badge color={model.status ? COLLECTION_MODEL_STATUS_COLORS[model.status] : "gray"} variant="light">
      {model.status ? COLLECTION_MODEL_STATUS_LABELS[model.status] : "Unknown"}
    </Badge>
  );
});

import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";

export type DeleteMode = "single" | "bulk";

export interface PendingDelete {
  mode: DeleteMode;
  modelId?: string;
}

export type ModelDeletion = ReturnType<typeof useDeleteConfirmation>;

export default function useDeleteConfirmation() {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  function requestDelete(modelId: string) {
    setPendingDelete({ mode: "single", modelId });
    open();
  }

  function requestBulkDelete(selectedIds: Set<string>) {
    if (selectedIds.size === 0) return;
    setPendingDelete({ mode: "bulk" });
    open();
  }

  function confirmDelete(
    deleteSingle: (modelId: string) => void,
    deleteBulk: (modelIds: string[]) => void,
    selectedIds: Set<string>,
  ) {
    if (!pendingDelete) return;

    if (pendingDelete.mode === "single" && pendingDelete.modelId) {
      deleteSingle(pendingDelete.modelId);
    } else {
      deleteBulk([...selectedIds]);
    }

    setPendingDelete(null);
    close();
  }

  return {
    confirmOpened: opened,
    openConfirm: open,
    closeConfirm: close,

    pendingDelete,
    requestDelete,
    requestBulkDelete,
    confirmDelete,
  };
}

import { useCallback, useState } from "react";
import type { DefinitionPublishAudit } from "@/generated";

type HistoryTarget = Readonly<{ id: string; name: string }>;

/**
 * Drives a {@link PublishHistoryModal}. Each definition page supplies its own fetcher, since the
 * audit trail is keyed by the kind of definition being looked at.
 */
export default function usePublishHistory(fetchHistory: (definitionId: string) => Promise<DefinitionPublishAudit[]>) {
  const [target, setTarget] = useState<HistoryTarget | null>(null);
  const [entries, setEntries] = useState<DefinitionPublishAudit[]>([]);
  const [loading, setLoading] = useState(false);

  const open = useCallback(
    (definitionId: string, name: string) => {
      setTarget({ id: definitionId, name });
      setEntries([]);
      setLoading(true);
      fetchHistory(definitionId)
        .then(setEntries)
        .catch(() => setEntries([]))
        .finally(() => setLoading(false));
    },
    [fetchHistory],
  );

  const close = useCallback(() => setTarget(null), []);

  return { target, entries, loading, open, close };
}

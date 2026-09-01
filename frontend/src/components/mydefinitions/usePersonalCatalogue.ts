import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import extractErrorMessage from "@/utils/extractErrorMessage.ts";

/** The little every personal definition has in common, which is all this hook needs to track one. */
export interface PersonalDefinition {
  id?: string;
  name: string;
}

export interface PersonalCatalogueApi<T extends PersonalDefinition> {
  /** The caller's own definitions: both their customisations and the ones they invented. */
  loadMine: (signal?: AbortSignal) => Promise<T[]>;
  /** The shared definitions on their own, to offer for customisation and to diff against. */
  loadShared: (signal?: AbortSignal) => Promise<T[]>;
  /** Forks a shared definition into one the caller owns. */
  customise: (id: string) => Promise<T | undefined>;
  /** Deletes one of the caller's own, which for a customisation is "revert to shared". */
  remove: (id: string) => Promise<void>;
}

/**
 * The shared lifecycle behind every "my definitions" page: load both lists, fork a shared
 * definition, delete one of your own, and keep the local copies in step without refetching.
 *
 * <p>This is deliberately not shared with the admin pages. Those run a draft -> review -> publish
 * workflow with pending changes, publish history and import/export, none of which exists here: a
 * personal edit is live for its owner the moment it is saved. Only the leaf components (the form
 * modals, the diff modal) are common to both.
 *
 * @param cachedQueryKeys query key roots the rest of the app caches this data under, dropped
 *     whenever something changes here. Pass a constant defined outside the component.
 */
export default function usePersonalCatalogue<T extends PersonalDefinition>(
  api: PersonalCatalogueApi<T>,
  cachedQueryKeys: readonly string[] = [],
) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [mine, setMine] = useState<T[]>([]);
  const [shared, setShared] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customisingIds, setCustomisingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { loadMine, loadShared, customise, remove } = api;

  // Collection pages cache the catalogue, so anything added, renamed or removed here would keep
  // showing the stale version there until that page is next mounted - a personal faction would be
  // missing from the faction filter, and models under it would show as "Uncategorised". Dropping
  // the cached copy outright, rather than invalidating it, makes the change visible immediately.
  const notifyChanged = useCallback(() => {
    for (const key of cachedQueryKeys) {
      queryClient.removeQueries({ queryKey: [key] });
    }
    // cachedQueryKeys is expected to be a module-level constant, so its identity is stable.
  }, [queryClient, cachedQueryKeys]);

  const reload = useCallback(
    (signal?: AbortSignal) => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      setLoading(true);
      Promise.all([loadMine(signal), loadShared(signal)])
        .then(([mineItems, sharedItems]) => {
          if (signal?.aborted) return;
          setMine(mineItems);
          setShared(sharedItems);
        })
        .catch((e) => {
          if (!signal?.aborted) setError(extractErrorMessage(e));
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [isAuthenticated, loadMine, loadShared],
  );

  useEffect(() => {
    const ac = new AbortController();
    reload(ac.signal);
    return () => ac.abort();
  }, [reload]);

  const upsertMine = useCallback((definition: T) => {
    setMine((current) =>
      current.some((d) => d.id === definition.id)
        ? current.map((d) => (d.id === definition.id ? definition : d))
        : [...current, definition],
    );
  }, []);

  const handleCustomise = useCallback(
    async (id: string) => {
      setError(null);
      withBusy(setCustomisingIds, id, true);
      try {
        const created = await customise(id);
        if (created) {
          upsertMine(created);
          notifyChanged();
        }
        return created;
      } catch (e) {
        setError(extractErrorMessage(e));
        return undefined;
      } finally {
        withBusy(setCustomisingIds, id, false);
      }
    },
    [customise, upsertMine, notifyChanged],
  );

  const handleRemove = useCallback(
    async (id: string) => {
      setError(null);
      withBusy(setRemovingIds, id, true);
      try {
        await remove(id);
        setMine((current) => current.filter((d) => d.id !== id));
        notifyChanged();
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        withBusy(setRemovingIds, id, false);
      }
    },
    [remove, notifyChanged],
  );

  return {
    isAuthenticated,
    isAuthLoading,
    mine,
    shared,
    loading,
    error,
    setError,
    customisingIds,
    removingIds,
    upsertMine,
    notifyChanged,
    handleCustomise,
    handleRemove,
  };
}

function withBusy(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, busy: boolean) {
  setter((current) => {
    const next = new Set(current);
    if (busy) next.add(id);
    else next.delete(id);
    return next;
  });
}

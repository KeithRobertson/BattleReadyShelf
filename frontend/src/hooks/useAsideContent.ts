import { type ReactNode, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import type { AppOutletContext } from "@/components/AppOutletContext.ts";

export function useAppAside() {
  return useOutletContext<AppOutletContext>();
}

/** Opens the aside the first time a selection appears, so bulk actions in it are not stranded on a phone. */
export function useOpenAsideOnSelection(selectedCount: number) {
  const { openAside } = useAppAside();
  const previousCount = useRef(0);

  useEffect(() => {
    if (selectedCount > 0 && previousCount.current === 0) {
      openAside();
    }
    previousCount.current = selectedCount;
  }, [selectedCount, openAside]);
}

/**
 * Pushes content into the app-shell aside and clears it when this page unmounts, so the next route
 * does not keep showing the previous page's context.
 *
 * Pass a memoised node. An inline element is a new object every render, which would write into
 * AppLayout and loop.
 */
export function useAsideContent(content: ReactNode) {
  const { setAsideContent } = useAppAside();

  useEffect(() => {
    setAsideContent(content);
    return () => setAsideContent(null);
  }, [content, setAsideContent]);
}

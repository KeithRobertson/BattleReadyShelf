import { useMediaQuery } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";

export function useResponsivePersistentDisclosure(key: string) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [opened, setOpened] = useState<boolean | undefined>(undefined);

  const toggle = useCallback(() => setOpened((v) => !v), []);
  const open = useCallback(() => setOpened(true), []);

  useEffect(() => {
    const saved = localStorage.getItem(key) === "true";

    if (isMobile) {
      setOpened(false);
    } else {
      setOpened(saved);
    }
  }, [isMobile, key]);

  useEffect(() => {
    if (!isMobile && opened !== undefined) {
      localStorage.setItem(key, opened.toString());
    }
  }, [opened, isMobile, key]);

  return { opened, toggle, open, isMobile };
}

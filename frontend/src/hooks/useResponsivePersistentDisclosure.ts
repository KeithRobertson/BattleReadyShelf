import { useMediaQuery } from "@mantine/hooks";
import { useEffect, useState } from "react";

export function useResponsivePersistentDisclosure(key: string) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [opened, setOpened] = useState<boolean | undefined>(undefined);

  const toggle = () => setOpened((v) => !v);

  // Resolve initial state once breakpoint is known
  useEffect(() => {
    const saved = localStorage.getItem(key) === "true";

    if (isMobile) {
      setOpened(false); // mobile always closed
    } else {
      setOpened(saved); // desktop uses saved value
    }
  }, [isMobile, key]);

  // Persist only on desktop
  useEffect(() => {
    if (!isMobile && opened !== undefined) {
      localStorage.setItem(key, opened.toString());
    }
  }, [opened, isMobile, key]);

  return { opened, toggle };
}

import type { ReactNode } from "react";

export type AppOutletContext = {
  setAsideContent: (content: ReactNode) => void;
  openAside: () => void;
};

import { createTheme } from "@mantine/core";

/**
 * Central Mantine theme definition. This is the one place app-wide look-and-feel (colours, default
 * component props, radii, etc.) should be configured — components themselves should never branch on
 * the active colour scheme (see `useMantineColorScheme`/`useComputedColorScheme` for reading it, and
 * the CSS `light-dark()` function for colour values that need to differ between light/dark mode,
 * e.g. `frontend/src/utils/collectionModelStatus.ts`).
 */
export const theme = createTheme({
  primaryColor: "blue",
});

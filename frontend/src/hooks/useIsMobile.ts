import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

/**
 * True below Mantine's `sm` breakpoint, i.e. on phone-sized viewports.
 *
 * Layouts that only rely on flex wrapping are not enough on their own: a modern phone reports a
 * CSS viewport around 400-500px, which is wide enough for two ~180px controls to sit side by side,
 * so the "wrap on small screens" intent silently never triggers. Deciding from the breakpoint makes
 * the mobile layout explicit instead of a side effect of how the content happens to measure.
 */
export default function useIsMobile(): boolean {
  const theme = useMantineTheme();
  return useMediaQuery(`(max-width: ${theme.breakpoints.sm})`) ?? false;
}

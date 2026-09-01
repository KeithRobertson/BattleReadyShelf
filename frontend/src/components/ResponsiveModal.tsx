import { Modal, type ModalProps, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

/**
 * A Mantine Modal that becomes a full-screen sheet on small viewports.
 *
 * Mantine's `size` is a fixed width, so a modal asking for `lg` (620px) or `xl` (780px) simply
 * overflows a 375px phone: content is clipped off the right edge and the close button can end up
 * unreachable. Going full-screen below the `sm` breakpoint is both the conventional mobile pattern
 * and the only way the wider editors have room for their form controls.
 *
 * `size` is still honoured above the breakpoint, so desktop layout is unchanged.
 */
export default function ResponsiveModal({ children, ...props }: Readonly<ModalProps>) {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  return (
    <Modal
      {...props}
      fullScreen={isMobile || props.fullScreen}
      // A full-screen sheet sliding up reads as a page change; the default scale/fade is for a
      // dialog floating above the page, which is no longer what this is.
      transitionProps={isMobile ? { transition: "slide-up" } : props.transitionProps}
    >
      {children}
    </Modal>
  );
}

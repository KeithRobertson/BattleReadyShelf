import { Box, Modal, type ModalProps } from "@mantine/core";
import type { ReactNode } from "react";
import useIsMobile from "@/hooks/useIsMobile.ts";

export type ResponsiveModalProps = Readonly<
  ModalProps & {
    /**
     * Action buttons for the modal. Pinned to the bottom of the modal rather than living at the end
     * of the scrollable content, so "Save" and "Cancel" stay reachable without scrolling past a
     * long form. Read-only modals with no actions can leave this unset.
     */
    footer?: ReactNode;
  }
>;

/**
 * A Mantine Modal that becomes a full-screen sheet on small viewports, optionally with its actions
 * pinned to the bottom.
 *
 * Mantine's `size` is a fixed width, so a modal asking for `lg` (620px) or `xl` (780px) simply
 * overflows a 375px phone: content is clipped off the right edge and the close button can end up
 * unreachable. Going full-screen below the `sm` breakpoint is both the conventional mobile pattern
 * and the only way the wider editors have room for their form controls.
 *
 * `size` is still honoured above the breakpoint, so desktop layout is unchanged.
 */
export default function ResponsiveModal({ children, footer, ...props }: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  const modalProps: ModalProps = {
    ...props,
    fullScreen: isMobile || props.fullScreen,
    // A full-screen sheet sliding up reads as a page change; the default scale/fade is for a
    // dialog floating above the page, which is no longer what this is.
    transitionProps: isMobile ? { transition: "slide-up" } : props.transitionProps,
  };

  if (!footer) {
    return <Modal {...modalProps}>{children}</Modal>;
  }

  return (
    <Modal
      {...modalProps}
      // By default the body grows with its content and the modal as a whole scrolls, which carries
      // the actions off the bottom of a tall form. Laying the content out as a column and giving
      // the body the leftover height means only the children scroll and the footer stays put.
      styles={{
        content: { display: "flex", flexDirection: "column" },
        body: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: 0 },
      }}
    >
      <Box p="md" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {children}
      </Box>
      <Box
        px="md"
        py="sm"
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--mantine-color-default-border)",
          background: "var(--mantine-color-body)",
        }}
      >
        {footer}
      </Box>
    </Modal>
  );
}

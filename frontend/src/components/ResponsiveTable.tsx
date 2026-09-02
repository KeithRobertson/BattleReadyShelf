import { Table, type TableProps } from "@mantine/core";
import type { ReactNode } from "react";
import useIsMobile from "@/hooks/useIsMobile.ts";

type ResponsiveTableProps = TableProps &
  Readonly<{
    /**
     * Width below which the table starts scrolling horizontally instead of squashing its columns.
     * Pick roughly the narrowest width at which the table is still readable.
     */
    minWidth?: number | string;
    /**
     * Drop `minWidth` below the `sm` breakpoint so the table fits the screen instead of scrolling.
     * Only for tables that shed their secondary columns on a phone (`visibleFrom="sm"`), otherwise
     * everything squashes together. Sideways scrolling to reach a row's buttons is easy to miss and
     * awkward to do, so collapsing columns is preferred where a table can support it.
     */
    fitOnMobile?: boolean;
    children?: ReactNode;
  }>;

/**
 * A `Table` that scrolls horizontally rather than forcing its parent wider.
 *
 * An unconstrained wide table does not just look bad on a phone: because it widens the document,
 * mobile browsers expand the layout viewport to match, and every `position: fixed` element - modals
 * and overlays included - is then laid out against that wider viewport. Keeping tables inside a
 * scroll container stops that from happening.
 */
export default function ResponsiveTable({
  minWidth = 480,
  fitOnMobile = false,
  children,
  ...tableProps
}: ResponsiveTableProps) {
  const isMobile = useIsMobile();

  return (
    <Table.ScrollContainer minWidth={fitOnMobile && isMobile ? 0 : minWidth} type="native">
      <Table {...tableProps}>{children}</Table>
    </Table.ScrollContainer>
  );
}

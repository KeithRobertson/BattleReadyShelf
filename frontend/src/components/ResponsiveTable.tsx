import { Table, type TableProps } from "@mantine/core";
import type { ReactNode } from "react";

type ResponsiveTableProps = TableProps &
  Readonly<{
    /**
     * Width below which the table starts scrolling horizontally instead of squashing its columns.
     * Pick roughly the narrowest width at which the table is still readable.
     */
    minWidth?: number | string;
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
export default function ResponsiveTable({ minWidth = 480, children, ...tableProps }: ResponsiveTableProps) {
  return (
    <Table.ScrollContainer minWidth={minWidth} type="native">
      <Table {...tableProps}>{children}</Table>
    </Table.ScrollContainer>
  );
}

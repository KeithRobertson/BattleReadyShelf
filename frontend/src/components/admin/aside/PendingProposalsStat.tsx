import { Anchor, Text } from "@mantine/core";
import { PENDING_CHANGES_ELEMENT_ID, scrollToElementId } from "@/components/admin/aside/adminAside.ts";

export type PendingProposalsStatProps = Readonly<{
  count: number;
}>;

/** Pending review stays in the main column; this is a jump link, not a second copy of the table. */
export function PendingProposalsStat({ count }: PendingProposalsStatProps) {
  if (count === 0) {
    return (
      <Text size="sm" c="dimmed">
        No pending proposals
      </Text>
    );
  }

  const label = count === 1 ? "1 pending proposal — jump to review" : `${count} pending proposals — jump to review`;

  return (
    <Anchor
      component="button"
      type="button"
      size="sm"
      ta="left"
      onClick={() => scrollToElementId(PENDING_CHANGES_ELEMENT_ID)}
    >
      {label}
    </Anchor>
  );
}

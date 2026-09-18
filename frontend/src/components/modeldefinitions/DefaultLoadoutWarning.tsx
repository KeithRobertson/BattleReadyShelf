import { Alert } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import slotsWithMultipleDefaults from "@/utils/modeldefinitions/slotsWithMultipleDefaults.ts";

type DefaultLoadoutWarningProps = Readonly<{
  slots: ReadonlyArray<{ id?: string; name?: string }>;
  options: ReadonlyArray<{ isDefault?: boolean; attachmentSlotIds?: string[] }>;
}>;

/** Permissive: overlapping defaults still save, but new miniatures leave those slots empty. */
export default function DefaultLoadoutWarning({ slots, options }: DefaultLoadoutWarningProps) {
  const names = slotsWithMultipleDefaults(slots, options);
  if (names.length === 0) {
    return null;
  }
  const list = names.join(", ");
  const many = names.length > 1;
  return (
    <Alert color="yellow" icon={<IconAlertTriangle size={16} />} title="Multiple defaults" mb="xs">
      {list} {many ? "each have" : "has"} more than one default wargear option. New miniatures will leave{" "}
      {many ? "those slots" : "that slot"} unassigned.
    </Alert>
  );
}

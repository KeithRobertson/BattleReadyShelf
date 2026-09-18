import { ActionIcon, Badge, Tooltip } from "@mantine/core";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

export function HiddenBadge() {
  return (
    <Badge variant="light" color="gray">
      Hidden
    </Badge>
  );
}

type HideDefinitionButtonProps = Readonly<{
  hidden: boolean;
  loading?: boolean;
  disabled?: boolean;
  /** Shown instead of the usual toggle label when the button cannot be used. */
  disabledReason?: string;
  onToggle: (hidden: boolean) => void;
}>;

/**
 * Offers or withdraws one definition from the caller's pickers. Eye-off means it is already out of
 * the way; clicking it puts it back.
 */
export default function HideDefinitionButton({
  hidden,
  loading,
  disabled,
  disabledReason,
  onToggle,
}: HideDefinitionButtonProps) {
  const label = hidden ? "Show in pickers" : "Hide from pickers";
  const tooltip = disabled && disabledReason ? disabledReason : label;

  const button = (
    <ActionIcon
      variant="subtle"
      aria-label={label}
      loading={loading}
      disabled={disabled}
      onClick={() => onToggle(!hidden)}
    >
      {hidden ? <IconEyeOff size={16} /> : <IconEye size={16} />}
    </ActionIcon>
  );

  return (
    <Tooltip label={tooltip}>
      {/* Disabled buttons do not hover, so the reason has to sit on a wrapper. */}
      {disabled ? <span>{button}</span> : button}
    </Tooltip>
  );
}

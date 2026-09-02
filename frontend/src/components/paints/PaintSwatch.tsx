import { ColorSwatch, Tooltip } from "@mantine/core";

type PaintSwatchProps = Readonly<{
  hexColour?: string | null;
  label?: string;
  /** Smaller where swatches are decoration rather than a control, e.g. on a model card. */
  size?: number;
}>;

const PLACEHOLDER =
  "linear-gradient(135deg, var(--mantine-color-gray-2) 25%, var(--mantine-color-gray-4) 25%, var(--mantine-color-gray-4) 50%, var(--mantine-color-gray-2) 50%, var(--mantine-color-gray-2) 75%, var(--mantine-color-gray-4) 75%)";

export default function PaintSwatch({ hexColour, label, size = 22 }: PaintSwatchProps) {
  const title = hexColour ? `${label ?? "Paint colour"}: ${hexColour}` : `${label ?? "Paint colour"}: no colour set`;

  return (
    <Tooltip label={title}>
      <ColorSwatch
        color={hexColour ?? PLACEHOLDER}
        size={size}
        radius="sm"
        title={title}
        style={hexColour ? undefined : { backgroundSize: "8px 8px", opacity: 0.75 }}
      />
    </Tooltip>
  );
}

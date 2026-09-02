import { Button, ColorInput, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import type React from "react";
import { type ReactNode, useEffect, useState } from "react";
import ResponsiveModal from "@/components/ResponsiveModal.tsx";
import type { Paint, PaintType, UpdatePaintRequest } from "@/generated";

const PAINT_TYPE_OPTIONS: { value: PaintType; label: string }[] = [
  { value: "BASE", label: "Base" },
  { value: "LAYER", label: "Layer" },
  { value: "SHADE", label: "Shade" },
  { value: "CONTRAST", label: "Contrast" },
  { value: "DRY", label: "Dry" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "PRIMER", label: "Primer" },
  { value: "VARNISH", label: "Varnish" },
  { value: "OTHER", label: "Other" },
];

export function paintTypeLabel(type?: PaintType | null) {
  return PAINT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? null;
}

export type PaintFormValues = UpdatePaintRequest;

type PaintFormModalProps = Readonly<{
  opened: boolean;
  title: string;
  submitLabel: string;
  notice?: ReactNode;
  paint: Pick<Paint, "name" | "brand" | "paintType" | "hexColour" | "externalId"> | null;
  saving: boolean;
  onClose: () => void;
  onSave: (values: PaintFormValues) => void;
}>;

const HEX_COLOUR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function normaliseOptional(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normaliseHexColour(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export default function PaintFormModal({
  opened,
  title,
  submitLabel,
  notice,
  paint,
  saving,
  onClose,
  onSave,
}: PaintFormModalProps) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [paintType, setPaintType] = useState<PaintType | null>(null);
  const [hexColour, setHexColour] = useState("");
  const [colourError, setColourError] = useState<string | null>(null);

  useEffect(() => {
    setName(paint?.name ?? "");
    setBrand(paint?.brand ?? "");
    setPaintType(paint?.paintType ?? null);
    setHexColour(paint?.hexColour ?? "");
    setColourError(null);
  }, [paint]);

  function buildValues(): PaintFormValues | null {
    const trimmedName = name.trim();
    const nextHexColour = normaliseHexColour(hexColour);
    if (trimmedName === "") return null;
    if (nextHexColour !== null && !HEX_COLOUR_PATTERN.test(nextHexColour)) {
      setColourError("Use a 6-digit hex colour like #a1b2c3, or leave it blank.");
      return null;
    }
    setColourError(null);
    return {
      name: trimmedName,
      brand: normaliseOptional(brand),
      paintType: paintType ?? undefined,
      hexColour: nextHexColour,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values = buildValues();
    if (values) onSave(values);
  }

  const values = buildValuesForComparison(name, brand, paintType, hexColour);
  const isUnchanged =
    values.name === (paint?.name ?? "") &&
    values.brand === (paint?.brand ?? null) &&
    values.paintType === (paint?.paintType ?? undefined) &&
    values.hexColour === (paint?.hexColour ?? null);

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={title}
      footer={
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="paint-form" loading={saving} disabled={values.name === "" || isUnchanged}>
            {submitLabel}
          </Button>
        </Group>
      }
    >
      <form id="paint-form" onSubmit={handleSubmit}>
        <Stack>
          {notice}

          {paint?.externalId != null && (
            <Text size="sm" c="dimmed">
              Dataset id{" "}
              <Text span ff="monospace">
                {paint.externalId}
              </Text>{" "}
              is not changed here, so a future import still matches this paint.
            </Text>
          )}

          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            data-autofocus
            required
          />
          <TextInput label="Brand" value={brand} onChange={(e) => setBrand(e.currentTarget.value)} />
          <Select
            label="Paint type"
            placeholder="None"
            data={PAINT_TYPE_OPTIONS}
            value={paintType}
            onChange={(value) => setPaintType((value as PaintType | null) ?? null)}
            clearable
          />
          <ColorInput
            label="Colour"
            placeholder="#a1b2c3"
            format="hex"
            withEyeDropper
            value={hexColour}
            onChange={(value) => {
              setHexColour(value);
              if (colourError) setColourError(null);
            }}
            error={colourError}
          />
        </Stack>
      </form>
    </ResponsiveModal>
  );
}

function buildValuesForComparison(name: string, brand: string, paintType: PaintType | null, hexColour: string) {
  return {
    name: name.trim(),
    brand: normaliseOptional(brand),
    paintType: paintType ?? undefined,
    hexColour: normaliseHexColour(hexColour),
  };
}

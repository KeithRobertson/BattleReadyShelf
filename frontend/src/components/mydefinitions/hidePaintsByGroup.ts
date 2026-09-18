import { isHidden } from "@/components/mydefinitions/catalogueVisibility";
import { PAINT_TYPE_OPTIONS } from "@/components/mydefinitions/PaintFormModal.tsx";
import type { Paint, PaintType } from "@/generated";

/** Sentinel for paints with no brand or no type, so a Select can still target them. */
export const NONE_PAINT_GROUP = "__none__";

export function paintBrandKey(paint: Paint): string {
  const brand = paint.brand?.trim();
  return brand ? brand : NONE_PAINT_GROUP;
}

export function paintTypeKey(paint: Paint): string {
  return paint.paintType ?? NONE_PAINT_GROUP;
}

export function paintBrandOptions(paints: readonly Paint[]): { value: string; label: string }[] {
  const brands = [
    ...new Set(paints.map((paint) => paint.brand?.trim()).filter((brand): brand is string => Boolean(brand))),
  ].toSorted((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const options = brands.map((brand) => ({ value: brand, label: brand }));
  if (paints.some((paint) => !paint.brand?.trim())) {
    options.push({ value: NONE_PAINT_GROUP, label: "No brand" });
  }
  return options;
}

export function paintTypeOptions(paints: readonly Paint[]): { value: string; label: string }[] {
  const present = new Set(paints.map((paint) => paint.paintType).filter((type): type is PaintType => Boolean(type)));
  const options: { value: string; label: string }[] = PAINT_TYPE_OPTIONS.filter((option) =>
    present.has(option.value),
  ).map((option) => ({
    value: option.value,
    label: option.label,
  }));
  if (paints.some((paint) => !paint.paintType)) {
    options.push({ value: NONE_PAINT_GROUP, label: "No type" });
  }
  return options;
}

export function paintsInBrand(paints: readonly Paint[], brandKey: string): Paint[] {
  return paints.filter((paint) => paintBrandKey(paint) === brandKey);
}

export function paintsInType(paints: readonly Paint[], typeKey: string): Paint[] {
  return paints.filter((paint) => paintTypeKey(paint) === typeKey);
}

/** Ids in the group that are still offered, or already hidden, so Hide/Show can target one state. */
export function paintGroupIds(paints: readonly Paint[], hidden: boolean): string[] {
  return paints.filter((paint) => Boolean(paint.id) && isHidden(paint) === hidden).map((paint) => paint.id ?? "");
}

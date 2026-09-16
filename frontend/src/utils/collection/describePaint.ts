import type { Paint } from "@/generated";

/** Brand plus name, matching how the paint picker labels a colour. */
export default function describePaint(paint: Pick<Paint, "brand" | "name">): string {
  const name = paint.name?.trim() || "Unknown paint";
  return paint.brand?.trim() ? `${paint.brand.trim()} ${name}` : name;
}

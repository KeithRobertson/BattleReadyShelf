import { SegmentedControl } from "@mantine/core";
import { CATALOGUE_VISIBILITY_OPTIONS, type CatalogueVisibility } from "@/components/mydefinitions/catalogueVisibility";

type CatalogueVisibilityFilterProps = Readonly<{
  value: CatalogueVisibility;
  onChange: (value: CatalogueVisibility) => void;
}>;

/** All / still offered / already hidden. Lives on the page that can put a row back. */
export default function CatalogueVisibilityFilter({ value, onChange }: CatalogueVisibilityFilterProps) {
  return (
    <SegmentedControl
      size="xs"
      value={value}
      onChange={(next) => onChange(next as CatalogueVisibility)}
      data={CATALOGUE_VISIBILITY_OPTIONS}
    />
  );
}

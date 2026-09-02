import type { TablerIcon } from "@tabler/icons-react";
import { IconPaint, IconSwords, IconTags, IconTagsChevronUp, IconTools, IconUsers } from "@tabler/icons-react";

export interface NavItem {
  label: string;
  to: string;
  icon: TablerIcon;
}

/** The user's own catalogue: their additions, and their customisations of the shared entries. */
export const myDefinitionNavItems: NavItem[] = [
  {
    label: "My Models",
    to: "/my/model-definitions",
    icon: IconTools,
  },
  {
    label: "My Factions",
    to: "/my/factions",
    icon: IconTagsChevronUp,
  },
  {
    label: "My Wargear",
    to: "/my/wargear-definitions",
    icon: IconSwords,
  },
  {
    label: "My Paints",
    to: "/my/paints",
    icon: IconPaint,
  },
];

export const adminNavItems: NavItem[] = [
  {
    label: "Manage Users",
    to: "/admin/users",
    icon: IconUsers,
  },
  {
    label: "Manage Model Definitions",
    to: "/admin/model-definitions",
    icon: IconTags,
  },
  {
    label: "Manage Faction Definitions",
    to: "/admin/faction-definitions",
    icon: IconTagsChevronUp,
  },
  {
    label: "Manage Wargear Definitions",
    to: "/admin/wargear-definitions",
    icon: IconSwords,
  },
  {
    label: "Manage Paints",
    to: "/admin/paint-definitions",
    icon: IconPaint,
  },
];

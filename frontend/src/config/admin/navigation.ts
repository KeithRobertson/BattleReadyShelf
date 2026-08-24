import type { TablerIcon } from "@tabler/icons-react";
import {
    IconUsers,
    IconTags,
    IconTagsChevronUp,
} from "@tabler/icons-react";

export interface NavItem {
    label: string;
    to: string;
    icon: TablerIcon;
}

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
];
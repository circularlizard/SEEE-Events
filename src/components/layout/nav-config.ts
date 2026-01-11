"use client";

import type { LucideIcon } from "lucide-react";
import {
  Compass,
  LayoutDashboard,
  CalendarDays,
  Users as UsersIcon,
  AlertTriangle,
  Shield,
  Code2,
  Workflow,
  Network,
} from "lucide-react";
import type { AppKey } from "@/types/app";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  requiresAdmin?: boolean;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

const expeditionNav: NavSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Unit Overview",
        href: "/dashboard/events/units",
        icon: UsersIcon,
      },
      {
        label: "Events",
        href: "/dashboard/events",
        icon: CalendarDays,
      },
    ],
  },
];

const multiNav: NavSection[] = [
  {
    title: "Members",
    items: [
      {
        label: "Members",
        href: "/dashboard/members",
        icon: UsersIcon,
        requiresAdmin: true,
      },
      {
        label: "Member Data Issues",
        href: "/dashboard/members/issues",
        icon: AlertTriangle,
        requiresAdmin: true,
      },
    ],
  },
  {
    title: "Sections",
    items: [
      {
        label: "Section Picker",
        href: "/dashboard/section-picker",
        icon: Compass,
      },
    ],
  },
];

const platformNav: NavSection[] = [
  {
    title: "Operations",
    items: [
      {
        label: "Patrol Data",
        href: "/dashboard/admin",
        icon: Shield,
      },
    ],
  },
  {
    title: "Developer Tools",
    items: [
      {
        label: "API Browser",
        href: "/dashboard/api-browser",
        icon: Code2,
      },
      {
        label: "Queue Debug",
        href: "/dashboard/debug/queue",
        icon: Workflow,
      },
      {
        label: "OAuth Resource",
        href: "/dashboard/debug/oauth",
        icon: Network,
      },
    ],
  },
];

const planningNav: NavSection[] = [
  {
    items: [
      {
        label: "Planning Home",
        href: "/dashboard/planning",
        icon: LayoutDashboard,
      },
      {
        label: "Unit Overview",
        href: "/dashboard/planning/events/units",
        icon: UsersIcon,
      },
      {
        label: "Events",
        href: "/dashboard/planning/events",
        icon: CalendarDays,
      },
    ],
  },
  {
    title: "Members",
    items: [
      {
        label: "Members",
        href: "/dashboard/planning/members",
        icon: UsersIcon,
        requiresAdmin: true,
      },
      {
        label: "Member Data Issues",
        href: "/dashboard/planning/members/issues",
        icon: AlertTriangle,
        requiresAdmin: true,
      },
    ],
  },
  {
    title: "Patrol Data",
    items: [
      {
        label: "Patrol Reference",
        href: "/dashboard/planning/patrol-data",
        icon: Shield,
        requiresAdmin: true,
      },
    ],
  },
];

const dataQualityNav: NavSection[] = [
  {
    items: [
      {
        label: "Data Quality Home",
        href: "/dashboard/data-quality",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Members",
    items: [
      {
        label: "Members",
        href: "/dashboard/data-quality/members",
        icon: UsersIcon,
      },
      {
        label: "Member Data Issues",
        href: "/dashboard/data-quality/members/issues",
        icon: AlertTriangle,
      },
    ],
  },
  {
    title: "Sections",
    items: [
      {
        label: "Section Picker",
        href: "/dashboard/section-picker",
        icon: Compass,
      },
    ],
  },
];

const NAV_MAP: Record<AppKey, NavSection[]> = {
  expedition: expeditionNav,
  multi: multiNav,
  "platform-admin": platformNav,
  planning: planningNav,
  "data-quality": dataQualityNav,
};

export function getNavSections(app: AppKey | null): NavSection[] {
  if (!app) return expeditionNav;
  return NAV_MAP[app] ?? expeditionNav;
}

"use client";

import { useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/store/use-store";
import { getNavSections } from "./nav-config";
import { eventsKeys, eventSummaryKeys, attendanceKeys, membersKeys } from "@/lib/query-keys";
import type { NavItem, NavSection } from "./nav-config";

export type VisibleNavSection = {
  title?: NavSection["title"];
  items: NavItem[];
};

function computeActiveHref(pathname: string | null, navItems: NavItem[]): string | null {
  if (!pathname) return null;

  let bestMatchHref: string | null = null;
  let bestScore = -1;

  for (const item of navItems) {
    const href = item.href;
    if (!href) continue;

    let score = -1;
    if (pathname === href) {
      score = href.length * 2;
    } else if (pathname.startsWith(`${href}/`)) {
      score = href.length;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatchHref = href;
    }
  }

  return bestMatchHref;
}

export function useNavigationMenu() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const currentSection = useStore((s) => s.currentSection);
  const selectedSections = useStore((s) => s.selectedSections);
  const availableSections = useStore((s) => s.availableSections);
  const setCurrentSection = useStore((s) => s.setCurrentSection);
  const setSelectedSections = useStore((s) => s.setSelectedSections);
  const clearQueue = useStore((s) => s.clearQueue);
  const currentApp = useStore((s) => s.currentApp);
  const userRole = useStore((s) => s.userRole);

  const isAdmin =
    (session as { roleSelection?: string } | null)?.roleSelection === "admin" || userRole === "admin";

  const navSections = useMemo(() => getNavSections(currentApp), [currentApp]);

  const visibleSections = useMemo<VisibleNavSection[]>(
    () =>
      navSections
        .map((section) => ({
          title: section.title,
          items: section.items.filter((item) => !item.requiresAdmin || isAdmin),
        }))
        .filter((section) => section.items.length > 0),
    [navSections, isAdmin]
  );

  const allNavItems = useMemo(() => visibleSections.flatMap((section) => section.items), [visibleSections]);

  const activeHref = useMemo(() => computeActiveHref(pathname ?? null, allNavItems), [pathname, allNavItems]);

  const hasMultiSelection = selectedSections.length > 0;
  const sectionLabel = hasMultiSelection
    ? selectedSections.map((s) => s.sectionName).join(", ")
    : currentSection?.sectionName ?? "No section selected";
  const multiNames = hasMultiSelection ? selectedSections.map((s) => s.sectionName) : [];
  const selectedSectionName = currentSection?.sectionName ?? null;

  const showSectionContext = availableSections.length > 0 && currentApp !== "platform-admin";
  const showSectionDropdown = availableSections.length > 1;

  const handleSectionChange = useCallback(
    (sectionId: string) => {
      const selected = availableSections.find((s) => s.sectionId === sectionId);
      if (!selected) return;

      setCurrentSection({
        sectionId: selected.sectionId,
        sectionName: selected.sectionName,
        sectionType: selected.sectionType,
        termId: selected.termId,
      });
      setSelectedSections([]);
      clearQueue();

      const appKey = currentApp || "expedition";
      queryClient.removeQueries({ queryKey: eventsKeys.all(appKey) });
      queryClient.removeQueries({ queryKey: eventSummaryKeys.all(appKey) });
      queryClient.removeQueries({ queryKey: attendanceKeys.all(appKey) });
      queryClient.removeQueries({ queryKey: membersKeys.all(appKey) });

      if (process.env.NODE_ENV !== "production") {
        console.debug("[Navigation] Section changed, cleared cached queries for app:", appKey);
      }
    },
    [availableSections, clearQueue, currentApp, queryClient, setCurrentSection, setSelectedSections]
  );

  const changeSectionHref = useMemo(
    () => `/dashboard/section-picker?redirect=${encodeURIComponent(pathname || "/dashboard")}`,
    [pathname]
  );

  const canChangeSection = availableSections.length > 1;

  return {
    visibleSections,
    activeHref,
    showSectionContext,
    showSectionDropdown,
    currentSection,
    sectionLabel,
    handleSectionChange,
    availableSections,
    changeSectionHref,
    canChangeSection,
    selectedSectionName,
    multiNames,
    currentApp,
  };
}

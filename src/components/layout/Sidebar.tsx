"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRateLimitTelemetry } from "@/hooks/useRateLimitTelemetry";
import { useStore } from "@/store/use-store";
import { getNavSections } from "./nav-config";
import { cn } from "@/lib/utils";
import { eventsKeys, eventSummaryKeys, attendanceKeys, membersKeys } from "@/lib/query-keys";

export default function Sidebar() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const currentSection = useStore((s) => s.currentSection);
  const selectedSections = useStore((s) => s.selectedSections);
  const availableSections = useStore((s) => s.availableSections);
  const setCurrentSection = useStore((s) => s.setCurrentSection);
  const setSelectedSections = useStore((s) => s.setSelectedSections);
  const clearQueue = useStore((s) => s.clearQueue);
  const currentApp = useStore((s) => s.currentApp);
  const userRole = useStore((s) => s.userRole);

  const isAdmin = (session as { roleSelection?: string } | null)?.roleSelection === "admin" || userRole === "admin";
  const navSections = getNavSections(currentApp);
  const app = currentApp || 'expedition';

  const hasMultiSelection = selectedSections.length > 0;
  const sectionLabel = hasMultiSelection
    ? selectedSections.map((s) => s.sectionName).join(", ")
    : currentSection?.sectionName ?? "No section selected";

  const showSectionContext = availableSections.length > 0 && currentApp !== "platform-admin";
  const showSectionDropdown = availableSections.length > 1;

  const handleSectionChange = (sectionId: string) => {
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

    // Clear app-namespaced queries
    queryClient.removeQueries({ queryKey: eventsKeys.all(app) });
    queryClient.removeQueries({ queryKey: eventSummaryKeys.all(app) });
    queryClient.removeQueries({ queryKey: attendanceKeys.all(app) });
    queryClient.removeQueries({ queryKey: membersKeys.all(app) });

    if (process.env.NODE_ENV !== "production") {
      console.debug("[Sidebar] Section changed, cleared cached queries for app:", app);
    }
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const canShowItem = (requiresAdmin?: boolean) => {
    if (!requiresAdmin) return true;
    return isAdmin;
  };

  return (
    <aside className="hidden md:flex w-60 flex-col border-r bg-muted">
      <div className="flex-1 overflow-y-auto space-y-6 text-sm p-4 min-h-0">
        {showSectionContext && (
          <div>
            <p className="px-2 text-xs font-semibold text-muted-foreground uppercase mb-1">Section</p>
            {showSectionDropdown && currentSection ? (
              <Select value={currentSection.sectionId} onValueChange={handleSectionChange}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map((section) => (
                    <SelectItem key={section.sectionId} value={section.sectionId}>
                      {section.sectionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="px-2 text-sm text-muted-foreground truncate">{sectionLabel}</div>
            )}
          </div>
        )}

        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter((item) => canShowItem(item.requiresAdmin));
          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <div key={section.title ?? idx} className="space-y-2">
              {section.title && (
                <p className="px-2 text-xs font-semibold text-muted-foreground uppercase">{section.title}</p>
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded-md transition-colors",
                      isActive(item.href)
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-border/80 px-4 py-4 bg-muted">
        <RateLimitSidebarIndicator />
      </div>
    </aside>
  );
}

function RateLimitSidebarIndicator() {
  const { data, isError, isFetching } = useRateLimitTelemetry();

  const view = useMemo(() => {
    if (!data) return null;

    const formatTtl = (ttl: number | null | undefined) => {
      if (!ttl || ttl <= 0) return null;
      if (ttl >= 60) {
        const minutes = Math.floor(ttl / 60);
        const seconds = ttl % 60;
        return `${minutes}m ${seconds}s`;
      }
      return `${ttl}s`;
    };

    if (data.hardLocked) {
      return {
        label: "Blocked",
        detail: `Upstream blocked${formatTtl(data.hardLockTtlSeconds) ? ` • ${formatTtl(data.hardLockTtlSeconds)} remaining` : ""}`,
        dotClass: "bg-destructive",
      };
    }

    if (data.softLocked) {
      return {
        label: "Cooling",
        detail: formatTtl(data.softLockTtlSeconds) ? `Resumes in ${formatTtl(data.softLockTtlSeconds)}` : "Resuming shortly",
        dotClass: "bg-amber-500",
      };
    }

    if (data.quota && data.quota.limit > 0) {
      const percentUsed = ((data.quota.limit - data.quota.remaining) / data.quota.limit) * 100;
      if (percentUsed >= 80) {
        return {
          label: "High usage",
          detail: `${data.quota.remaining}/${data.quota.limit} remaining`,
          dotClass: "bg-amber-500",
        };
      }

      return {
        label: "Stable",
        detail: `${data.quota.remaining}/${data.quota.limit} remaining`,
        dotClass: "bg-emerald-500",
      };
    }

    return {
      label: "Stable",
      detail: null,
      dotClass: "bg-emerald-500",
    };
  }, [data]);

  const statusLabel = view?.label ?? (isFetching ? "Checking…" : isError ? "Unavailable" : "Unknown");
  const dotClass = view?.dotClass ?? (isError ? "bg-amber-500/70" : "bg-muted-foreground/40");
  const detail = view?.detail ?? null;

  return (
    <div className="mt-4 border-t border-border/80 pt-4 text-[11px] text-muted-foreground shrink-0">
      <div className="flex items-center justify-between gap-2" title={detail ?? undefined}>
        <span className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} aria-hidden />
          <span className="uppercase tracking-wide">Rate limit</span>
        </span>
        <span className="text-foreground font-medium">{statusLabel}</span>
      </div>
      {detail ? <p className="mt-1 text-muted-foreground/80">{detail}</p> : null}
    </div>
  );
}

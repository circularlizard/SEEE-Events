"use client";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { DataLoadingBanner } from "./DataLoadingBanner";
import { RateLimitTelemetryBanner } from "./RateLimitTelemetryBanner";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useMembers } from "@/hooks/useMembers";
import { useEvents } from "@/hooks/useEvents";
import { useStore } from "@/store/use-store";
import { useLogout } from "@/components/QueryProvider";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const currentSection = useStore((s) => s.currentSection);
  const selectedSections = useStore((s) => s.selectedSections);
  const logout = useLogout();
  
  // Global inactivity timeout for authenticated users
  useSessionTimeout({ onTimeout: logout });
  
  // Members data via React Query (single source of truth)
  // This hook triggers data loading with 3-phase progressive enrichment
  const { members, isLoading: membersLoading, isFetched: membersFetched, isAdmin } = useMembers();
  
  // Events data via React Query (single source of truth)
  // This hook triggers data loading and updates the data loading tracker
  const { events, isLoading: eventsLoading, isFetched: eventsFetched } = useEvents();
  
  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      if (isAdmin) {
        console.log('[ClientShell] Members (React Query):', {
          loading: membersLoading,
          fetched: membersFetched,
          count: members.length,
        });
      }
      console.log('[ClientShell] Events (React Query):', {
        loading: eventsLoading,
        fetched: eventsFetched,
        count: events.length,
      });
    }
  }, [
    membersLoading,
    membersFetched,
    members.length,
    isAdmin,
    eventsLoading,
    eventsFetched,
    events.length,
  ]);
  
  // Hide sidebar on section picker page for focused UX
  const isSectionPickerPage = pathname === '/dashboard/section-picker';
  
  // Determine if we should show the banner (has section selected)
  const hasSection = !!currentSection?.sectionId || (selectedSections && selectedSections.length > 0);
  // Only render the full application chrome when authenticated.
  // Hide during loading state to prevent flash of navigation on login page
  if (status === "loading" || status === "unauthenticated") {
    return <main className="min-h-screen">{children}</main>;
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {!isSectionPickerPage && hasSection && <RateLimitTelemetryBanner />}
      {!isSectionPickerPage && hasSection && <DataLoadingBanner />}
      <div className="flex flex-1">
        {!isSectionPickerPage && <Sidebar />}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

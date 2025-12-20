"use client";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { DataLoadingBanner } from "./DataLoadingBanner";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useMembersHydration } from "@/hooks/useMembersHydration";
import { useEvents } from "@/hooks/useEvents";
import { useStore } from "@/store/use-store";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const currentSection = useStore((s) => s.currentSection);
  const selectedSections = useStore((s) => s.selectedSections);
  
  // Global inactivity timeout for authenticated users
  useSessionTimeout();
  
  // Global member data hydration for admin users
  const membersHydration = useMembersHydration();
  
  // Events data via React Query (single source of truth)
  // This hook triggers data loading and updates the data loading tracker
  const { events, isLoading: eventsLoading, isFetched: eventsFetched } = useEvents();
  
  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      if (membersHydration.isAdmin) {
        console.log('[ClientShell] Members hydration:', {
          state: membersHydration.loadingState,
          count: membersHydration.members.length,
        });
      }
      console.log('[ClientShell] Events (React Query):', {
        loading: eventsLoading,
        fetched: eventsFetched,
        count: events.length,
      });
    }
  }, [
    membersHydration.loadingState,
    membersHydration.members.length,
    membersHydration.isAdmin,
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
      {!isSectionPickerPage && hasSection && <DataLoadingBanner />}
      <div className="flex flex-1">
        {!isSectionPickerPage && <Sidebar />}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

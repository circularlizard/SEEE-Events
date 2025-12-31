"use client";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { DataLoadingBanner } from "./DataLoadingBanner";
import { RateLimitTelemetryBanner } from "./RateLimitTelemetryBanner";
import PermissionDenied from "@/components/PermissionDenied";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useMembers } from "@/hooks/useMembers";
import { useEvents } from "@/hooks/useEvents";
import { useStore } from "@/store/use-store";
import { useLogout } from "@/components/QueryProvider";
import { getDefaultPathForApp, getRequiredAppForPath, getRequiredRoleForPath, isRoleAllowed } from "@/lib/app-route-guards";
import type { AppKey } from "@/types/app";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentSection = useStore((s) => s.currentSection);
  const selectedSections = useStore((s) => s.selectedSections);
  const currentApp = useStore((s) => s.currentApp);
  const userRole = useStore((s) => s.userRole);
  const permissionValidated = useStore((s) => s.permissionValidated);
  const missingPermissions = useStore((s) => s.missingPermissions);
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
  
  const isDashboardRoute = pathname?.startsWith('/dashboard');
  const requiredApp = useMemo(() => {
    if (!isDashboardRoute || !pathname) return null;
    return getRequiredAppForPath(pathname);
  }, [isDashboardRoute, pathname]);

  const requiredRole = useMemo(() => {
    if (!isDashboardRoute || !pathname) return null;
    return getRequiredRoleForPath(pathname);
  }, [isDashboardRoute, pathname]);

  // If the URL contains an appSelection query param, we're in the middle of switching apps.
  // Don't render dashboard content or redirect based on stale persisted app state until
  // StartupInitializer consumes the param and updates the store.
  const urlAppSelection: AppKey | null = useMemo(() => {
    const raw = searchParams.get('appSelection')
    return (raw as AppKey | null) ?? null
  }, [searchParams]);

  useEffect(() => {
    if (!isDashboardRoute) return;
    if (!requiredApp || !currentApp) return;
    if (requiredApp === currentApp) return;

    // If appSelection is present in the URL, wait for StartupInitializer to reconcile it.
    if (urlAppSelection) return;

    const targetPath = getDefaultPathForApp(currentApp);
    const params = new URLSearchParams();
    params.set('app', currentApp);
    params.set('redirectedFrom', pathname);
    router.replace(`${targetPath}?${params.toString()}`);
  }, [currentApp, isDashboardRoute, pathname, requiredApp, router, urlAppSelection]);

  useEffect(() => {
    if (!isDashboardRoute) return;
    if (!requiredRole) return;
    if (!userRole) return;
    if (isRoleAllowed(requiredRole, userRole)) return;
    router.replace('/forbidden');
  }, [isDashboardRoute, requiredRole, router, userRole]);

  const isSectionPickerPage = pathname === '/dashboard/section-picker';

  const effectiveApp = currentApp ?? 'expedition';
  const appUsesSectionChrome = effectiveApp === 'expedition' || effectiveApp === 'multi' || effectiveApp === 'planning';
  
  // Determine if we should show the banner (has section selected)
  const hasSection = !!currentSection?.sectionId || (selectedSections && selectedSections.length > 0);
  const shouldShowSectionChrome = appUsesSectionChrome && hasSection && !isSectionPickerPage;
  const appMismatch = Boolean(isDashboardRoute && requiredApp && currentApp && requiredApp !== currentApp && !urlAppSelection);
  const awaitingAppContext = Boolean(
    isDashboardRoute &&
      requiredApp &&
      (!currentApp || (urlAppSelection && currentApp !== urlAppSelection))
  );
  const roleMismatch = Boolean(isDashboardRoute && requiredRole && userRole && !isRoleAllowed(requiredRole, userRole));
  const permissionDenied = Boolean(currentApp && !permissionValidated && missingPermissions.length > 0);
  const permissionPending = Boolean(isDashboardRoute && currentApp && !permissionValidated && missingPermissions.length === 0);

  // Only render the full application chrome when authenticated.
  // Hide during loading state to prevent flash of navigation on login page
  if (status === "loading" || status === "unauthenticated") {
    return <main className="min-h-screen">{children}</main>;
  }

  if (awaitingAppContext || appMismatch || roleMismatch || permissionPending) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">
          {roleMismatch
            ? 'Checking permissions…'
            : permissionPending
            ? 'Validating permissions…'
            : appMismatch
            ? 'Switching to your selected app…'
            : 'Loading application context…'}
        </div>
      </main>
    );
  }

  // Show permission denied screen if validation failed (REQ-AUTH-16)
  if (permissionDenied) {
    return <PermissionDenied app={currentApp as AppKey} missingPermissions={missingPermissions} />;
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {shouldShowSectionChrome && <RateLimitTelemetryBanner />}
      {shouldShowSectionChrome && <DataLoadingBanner />}
      <div className="flex flex-1">
        {!isSectionPickerPage && <Sidebar />}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

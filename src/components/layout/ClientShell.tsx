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
import { useEvents } from "@/hooks/useEvents";
import { useStore } from "@/store/use-store";
import { useLogout } from "@/components/QueryProvider";
import { getDefaultPathForApp, getRequiredAppForPath, getRequiredRoleForPath, isRoleAllowed } from "@/lib/app-route-guards";
import { findSeeeSection, SEEE_FALLBACK_SECTION, SEEE_SECTION_ID, SEEE_SECTION_TYPE } from "@/lib/seee";
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
  const availableSections = useStore((s) => s.availableSections);
  const setCurrentApp = useStore((s) => s.setCurrentApp);
  const setCurrentSection = useStore((s) => s.setCurrentSection);
  const setSelectedSections = useStore((s) => s.setSelectedSections);
  const logout = useLogout();
  
  // Global inactivity timeout for authenticated users
  useSessionTimeout({ onTimeout: logout });
  
  // Events data via React Query (single source of truth)
  // This hook triggers data loading and updates the data loading tracker
  const { events, isLoading: eventsLoading, isFetched: eventsFetched } = useEvents();
  
  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ClientShell] Events (React Query):', {
        loading: eventsLoading,
        fetched: eventsFetched,
        count: events.length,
      });
    }
  }, [
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
    if (!requiredApp) return;
    if (requiredApp === currentApp) return;
    if (urlAppSelection) return;
    setCurrentApp(requiredApp);
  }, [currentApp, isDashboardRoute, requiredApp, setCurrentApp, urlAppSelection]);

  useEffect(() => {
    if (!isDashboardRoute) return;
    if (!currentApp) return;
    const isSeeeApp = currentApp === 'planning' || currentApp === 'expedition';
    if (!isSeeeApp) return;
    const hasSeeeSectionSelected = currentSection?.sectionId === SEEE_SECTION_ID && currentSection?.termId;
    if (hasSeeeSectionSelected) return;

    const seeeSection = findSeeeSection(availableSections) ?? SEEE_FALLBACK_SECTION;
    const nextTermId = seeeSection.termId ?? currentSection?.termId ?? '0';

    setCurrentSection({
      sectionId: SEEE_SECTION_ID,
      sectionName: seeeSection.sectionName,
      sectionType: seeeSection.sectionType ?? SEEE_SECTION_TYPE,
      termId: nextTermId,
    });
    setSelectedSections([]);
  }, [
    availableSections,
    currentApp,
    currentSection?.sectionId,
    currentSection?.termId,
    isDashboardRoute,
    setCurrentSection,
    setSelectedSections,
  ]);

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
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      {shouldShowSectionChrome && <RateLimitTelemetryBanner />}
      {shouldShowSectionChrome && <DataLoadingBanner />}
      <div className="flex flex-1 min-h-0">
        {!isSectionPickerPage && <Sidebar />}
        <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
      </div>
    </div>
  );
}

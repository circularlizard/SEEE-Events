"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/store/use-store";

/**
 * Expedition Viewer Home Page
 * 
 * Redirects to the Attendance Overview page which serves as the main dashboard
 * for the Expedition Viewer app.
 */
export default function ExpeditionHomePage() {
  const { status } = useSession();
  const router = useRouter();
  const hasHydrated = useStore((s) => s._hasHydrated);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/?callbackUrl=/dashboard");
      return;
    }
    
    if (status === "authenticated" && hasHydrated) {
      router.replace("/dashboard/events/attendance");
    }
  }, [status, hasHydrated, router]);

  // Show loading skeleton while redirecting
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

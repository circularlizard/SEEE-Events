"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardHome } from "@/components/domain/DashboardHome";

/**
 * Expedition Viewer Home Page
 * 
 * Shows a dashboard with tiles for Events and Unit Details.
 * Data loads progressively - tiles show loading states then populate with previews.
 */
export default function ExpeditionHomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/?callbackUrl=/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return null;
  }

  return <DashboardHome />;
}

"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PlanningDashboardHome } from "@/components/domain/PlanningDashboardHome";

export default function PlanningHomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/?callbackUrl=/dashboard/planning");
    }
  }, [status, router]);

  if (status === "loading") {
    return null;
  }

  return <PlanningDashboardHome />;
}

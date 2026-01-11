"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DataQualityDashboardHome } from "@/components/domain/DataQualityDashboardHome";

export default function DataQualityDashboard() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/?callbackUrl=/dashboard/data-quality");
    }
  }, [status, router]);

  if (status === "loading") {
    return null;
  }

  return <DataQualityDashboardHome />;
}

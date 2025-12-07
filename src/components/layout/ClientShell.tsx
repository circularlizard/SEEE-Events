"use client";
import { useSession } from "next-auth/react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import SummaryQueueBanner from "./SummaryQueueBanner";
import { useEvents } from "@/hooks/useEvents";
import { useEffect, useRef } from "react";
import { useEventSummaryQueue } from "@/hooks/useEventSummaryQueue";
import { useStore } from "@/store/use-store";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const currentSection = useStore((s) => s.currentSection);
  const selectedSections = useStore((s) => s.selectedSections);
  const { data } = useEvents();
  const { enqueue } = useEventSummaryQueue({ concurrency: 2, delayMs: 800, retryBackoffMs: 5000 });
  const enqueuedRef = useRef(false);
  useEffect(() => {
    // Enqueue once per session when events are available (single or multi-section)
    const hasSection = !!currentSection?.sectionId || (selectedSections && selectedSections.length > 0);
    if (!hasSection) return;
    if (enqueuedRef.current) return;
    const items = data?.items ?? [];
    if (items.length) {
      const ids = Array.from(new Set(items.map((e: any) => e.eventid)));
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[ClientShell] Enqueue event summary IDs:', ids);
      }
      enqueue(ids);
      enqueuedRef.current = true;
    }
  }, [currentSection?.sectionId, selectedSections, data, enqueue]);
  // Only render the full application chrome when authenticated.
  // Hide during loading state to prevent flash of navigation on login page
  if (status === "loading" || status === "unauthenticated") {
    return <main className="min-h-screen">{children}</main>;
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <SummaryQueueBanner />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

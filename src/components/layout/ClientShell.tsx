"use client";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import SummaryQueueBanner from "./SummaryQueueBanner";
import { useEvents } from "@/hooks/useEvents";
import { useEffect, useRef } from "react";
import { useQueueProcessor } from "@/hooks/useQueueProcessor";
import { useStore, type Section } from "@/store/use-store";
import type { Event } from "@/lib/schemas";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const currentSection = useStore((s) => s.currentSection);
  const selectedSections = useStore((s) => s.selectedSections);
  const enqueueItems = useStore((s) => s.enqueueItems);
  const { data } = useEvents();
  
  // Hide sidebar on section picker page for focused UX
  const isSectionPickerPage = pathname === '/dashboard/section-picker';
  
  // Mount the global queue processor once
  const processorState = useQueueProcessor({ concurrency: 2, delayMs: 800, retryBackoffMs: 5000 });
  
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ClientShell] Queue processor mounted. State:', processorState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we intentionally track individual properties
  }, [processorState.queueLength, processorState.running, processorState.timerActive]);
  
  const enqueuedRef = useRef<{ sectionKey?: string; ids?: number[]; done: boolean }>({ done: false });
  
  useEffect(() => {
    // Enqueue when events are available
    const hasSection = !!currentSection?.sectionId || (selectedSections && selectedSections.length > 0);
    if (!hasSection) return;
    
    const sectionKey = currentSection?.sectionId || (selectedSections?.map((s: Section) => s.sectionId).sort().join(',')) || 'none';
    const items = data?.items ?? [];
    
    if (items.length) {
      const ids = Array.from(new Set(items.map((e: Event) => Number(e.eventid))));
      
      if (process.env.NODE_ENV !== 'production') {
        const sectionCtx = currentSection?.sectionName || (selectedSections?.length ? `${selectedSections.length} sections` : 'unknown section');
        console.debug('[ClientShell] Preparing enqueue. Events:', items.length, 'Unique IDs:', ids.length, 'Section(s):', sectionCtx);
        console.debug('[ClientShell] Enqueue event summary IDs:', ids);
      }
      
      // If section or ids changed, allow re-enqueue
      const changedSection = enqueuedRef.current.sectionKey !== sectionKey;
      const changedIds = JSON.stringify(enqueuedRef.current.ids || []) !== JSON.stringify(ids);
      
      if (changedSection || changedIds || !enqueuedRef.current.done) {
        enqueueItems(ids);
        enqueuedRef.current = { sectionKey, ids, done: true };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sectionName is only for logging, not logic
  }, [currentSection?.sectionId, selectedSections, data, enqueueItems]);
  // Only render the full application chrome when authenticated.
  // Hide during loading state to prevent flash of navigation on login page
  if (status === "loading" || status === "unauthenticated") {
    return <main className="min-h-screen">{children}</main>;
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {!isSectionPickerPage && <SummaryQueueBanner />}
      <div className="flex flex-1">
        {!isSectionPickerPage && <Sidebar />}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

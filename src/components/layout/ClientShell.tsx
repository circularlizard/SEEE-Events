"use client";
import { useSession } from "next-auth/react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import SummaryQueueBanner from "./SummaryQueueBanner";
import { useEvents } from "@/hooks/useEvents";
import { useEffect, useRef } from "react";
import { useQueueProcessor } from "@/hooks/useQueueProcessor";
import { useStore } from "@/store/use-store";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const currentSection = useStore((s) => s.currentSection);
  const selectedSections = useStore((s) => s.selectedSections);
  const enqueueItems = useStore((s) => s.enqueueItems);
  const { data } = useEvents();
  
  // Mount the global queue processor once
  const processorState = useQueueProcessor({ concurrency: 2, delayMs: 800, retryBackoffMs: 5000 });
  
  useEffect(() => {
    console.log('[ClientShell] Queue processor mounted. State:', processorState);
  }, [processorState.queueLength, processorState.running, processorState.timerActive]);
  
  const enqueuedRef = useRef<{ sectionKey?: string; ids?: number[]; done: boolean }>({ done: false });
  
  useEffect(() => {
    // Enqueue when events are available
    const hasSection = !!currentSection?.sectionId || (selectedSections && selectedSections.length > 0);
    if (!hasSection) return;
    
    const sectionKey = currentSection?.sectionId || (selectedSections?.map((s:any)=>s.sectionId).sort().join(',')) || 'none';
    const items = data?.items ?? [];
    
    if (items.length) {
      const ids = Array.from(new Set(items.map((e: any) => e.eventid)));
      
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
  }, [currentSection?.sectionId, selectedSections, data, enqueueItems]);
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

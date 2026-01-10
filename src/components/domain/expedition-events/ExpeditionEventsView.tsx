"use client";
import { useMemo } from "react";
import { AlertCircle, CalendarDays } from "lucide-react";
import type { Event } from "@/lib/schemas";
import { Card } from "@/components/ui/card";
import { EventsListSkeleton } from "@/components/domain/EventsListSkeleton";
import { EventCard } from "@/components/domain/EventCard";
import { ExportMenu } from "@/components/domain/export";
import { useExportViewContext, createExportColumn } from "@/hooks/useExportContext";
import type { ExportColumn, ExportRow } from "@/lib/export/types";
import { useConsolidatedAttendance } from "@/components/domain/consolidated-attendance/useConsolidatedAttendance";

interface ExpeditionEventsViewProps {
  events: Event[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  title?: string;
  description?: string;
  buildEventHref?: (event: Event) => string;
}

export function ExpeditionEventsView({
  events,
  isLoading = false,
  isError = false,
  error = null,
  title = "Events",
  description,
  buildEventHref,
}: ExpeditionEventsViewProps) {
  const { attendees, getPatrolName } = useConsolidatedAttendance();
  const resolvedDescription =
    description ?? `${events.length} ${events.length === 1 ? "event" : "events"} found`;

  // Build a set of visible event IDs for filtering export data
  const visibleEventIds = useMemo(() => new Set(events.map((e) => Number(e.eventid))), [events]);

  // Build export columns - organized by event (REQ-VIEW-10)
  const exportColumns = useMemo<ExportColumn[]>(() => [
    createExportColumn("eventName", "Event", "string"),
    createExportColumn("eventDate", "Date", "string"),
    createExportColumn("participantName", "Participant", "string"),
    createExportColumn("unit", "Unit", "string"),
  ], []);

  // Build export rows - one row per participant-event combination
  const exportRows = useMemo<ExportRow[]>(() => {
    const rows: ExportRow[] = [];
    
    // Build event lookup for names and dates
    const eventLookup = new Map<number, { name: string; date: string }>();
    for (const event of events) {
      const startDate = event.startdate ? new Date(event.startdate).toLocaleDateString() : "";
      const endDate = event.enddate ? new Date(event.enddate).toLocaleDateString() : "";
      const dateStr = startDate && endDate && startDate !== endDate 
        ? `${startDate} — ${endDate}` 
        : startDate || "—";
      eventLookup.set(Number(event.eventid), { name: event.name, date: dateStr });
    }

    // Iterate through attendees and their events
    for (const person of attendees) {
      for (const event of person.events) {
        // Only include events that are in the visible list
        if (!visibleEventIds.has(Number(event.id))) continue;
        
        const eventInfo = eventLookup.get(Number(event.id));
        rows.push({
          eventName: eventInfo?.name ?? event.name,
          eventDate: eventInfo?.date ?? "—",
          participantName: person.name,
          unit: getPatrolName(person.patrolId),
        });
      }
    }

    // Sort by event name, then participant name
    rows.sort((a, b) => {
      const eventCmp = String(a.eventName).localeCompare(String(b.eventName));
      if (eventCmp !== 0) return eventCmp;
      return String(a.participantName).localeCompare(String(b.participantName));
    });

    return rows;
  }, [attendees, events, visibleEventIds, getPatrolName]);

  // Create export context (REQ-VIEW-10, REQ-VIEW-12)
  const exportContext = useExportViewContext({
    id: "all-events-participants",
    title: "All Events - Participants",
    columns: exportColumns,
    rows: exportRows,
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <Header title={title} description="Loading events..." />
        <EventsListSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 md:p-6">
        <Header title={title} description="We couldn't load events right now." />
        <div className="flex items-center gap-3 p-4 border border-destructive/50 bg-destructive/10 rounded-lg text-destructive">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">Failed to load events</p>
            <p className="text-sm">{error?.message ?? "An unexpected error occurred."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <Header title={title} description={resolvedDescription} exportContext={exportContext} />
      {events.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No events found.</Card>
      ) : (
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {events.map((event) => (
            <EventCard
              key={event.eventid}
              event={event}
              href={buildEventHref ? buildEventHref(event) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Header({ 
  title, 
  description, 
  exportContext 
}: { 
  title: string; 
  description: string;
  exportContext?: ReturnType<typeof useExportViewContext>;
}) {
  return (
    <div className="mb-6 rounded-lg bg-primary text-primary-foreground px-4 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" aria-hidden />
            <span>{title}</span>
          </h1>
          <p className="mt-1 text-sm md:text-base opacity-90">{description}</p>
        </div>
        {exportContext && (
          <ExportMenu
            context={exportContext}
            label="Export All Participants"
            buttonVariant="ghost"
            className="self-start border border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20"
          />
        )}
      </div>
    </div>
  );
}

"use client";
import { AlertCircle, CalendarDays } from "lucide-react";
import type { Event } from "@/lib/schemas";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventsListSkeleton } from "@/components/domain/EventsListSkeleton";
import { EventCard } from "@/components/domain/EventCard";

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
  const resolvedDescription =
    description ?? `${events.length} ${events.length === 1 ? "event" : "events"} found`;

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
      <Header title={title} description={resolvedDescription} />
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

function Header({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6 rounded-lg bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6" aria-hidden />
          <span>{title}</span>
        </h1>
        <p className="mt-1 text-sm md:text-base opacity-90">{description}</p>
      </div>
    </div>
  );
}

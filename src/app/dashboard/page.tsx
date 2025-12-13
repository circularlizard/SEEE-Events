"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore, useEventsData, useEventsLoadingState } from "@/store/use-store";
import { CalendarDays, MapPin, Users, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { Event } from "@/lib/schemas";

/** Format date range for display */
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  
  if (startDate === endDate) {
    return startStr
  }
  return `${startStr} — ${endStr}`
}

/** Get upcoming events sorted by start date */
function getUpcomingEvents(events: Event[], limit: number): Event[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  return events
    .filter(e => {
      const endDate = new Date(e.enddate)
      return endDate >= now
    })
    .sort((a, b) => new Date(a.startdate).getTime() - new Date(b.startdate).getTime())
    .slice(0, limit)
}

/** Event card component with colored header */
function EventCard({ event }: { event: Event }) {
  return (
    <Link href={`/dashboard/events/${event.eventid}`} className="block group">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="bg-primary text-primary-foreground py-3 px-4">
          <CardTitle className="text-base font-semibold truncate group-hover:underline">
            {event.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>{formatDateRange(event.startdate, event.enddate)}</span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3 pt-2 border-t">
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium">{event.yes}</span>
              <span className="text-muted-foreground">Yes</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="font-medium">{event.no}</span>
              <span className="text-muted-foreground">No</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="font-medium">{event.invited}</span>
              <span className="text-muted-foreground">Invited</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  
  const currentSection = useStore((s) => s.currentSection);
  const selectedSections = useStore((s) => s.selectedSections);
  const availableSections = useStore((s) => s.availableSections);
  
  // Use hydrated events data from the store
  const events = useEventsData();
  const eventsLoadingState = useEventsLoadingState();
  const eventsLoading = eventsLoadingState === 'loading' || eventsLoadingState === 'idle';
  
  // Determine section display
  const sectionDisplay = useMemo(() => {
    if (selectedSections && selectedSections.length > 0) {
      return {
        name: selectedSections.map(s => s.sectionName).join(', '),
        count: selectedSections.length,
        isMultiple: true,
      }
    }
    if (currentSection) {
      return {
        name: currentSection.sectionName,
        count: 1,
        isMultiple: false,
      }
    }
    return null
  }, [currentSection, selectedSections])
  
  // Get next 3 upcoming events
  const upcomingEvents = useMemo(() => {
    if (events.length === 0) return []
    return getUpcomingEvents(events, 3)
  }, [events])

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/?callbackUrl=/dashboard");
    return null;
  }

  if (status === "loading") {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  // If the user is authenticated, has multiple available sections, but no
  // current/selected section yet, StartupInitializer will shortly redirect
  // them to the section picker. To avoid flashing the main dashboard before
  // that redirect occurs, render a minimal loading state here.
  const needsSectionSelection =
    availableSections.length > 1 && !currentSection && (!selectedSections || selectedSections.length === 0);

  if (needsSectionSelection) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Section Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          {sectionDisplay && (
            <p className="text-muted-foreground mt-1">
              {sectionDisplay.isMultiple ? (
                <span>{sectionDisplay.count} sections selected</span>
              ) : (
                <span>{sectionDisplay.name}</span>
              )}
            </p>
          )}
        </div>
        <Link href="/dashboard/events">
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            View All Events
          </Button>
        </Link>
      </div>

      {/* Upcoming Events */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>
        
        {eventsLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : upcomingEvents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No upcoming events</p>
              <p className="text-sm text-muted-foreground mt-1">
                Events will appear here once they are scheduled.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.eventid} event={event} />
            ))}
          </div>
        )}
        
        {upcomingEvents.length > 0 && events.length > 3 && (
          <div className="mt-4 text-center">
            <Link href="/dashboard/events" className="text-sm text-primary hover:underline">
              View all {events.length} events →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

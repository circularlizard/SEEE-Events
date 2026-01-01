# Attendance Screen Redesign Plan

**Date:** 2026-01-01  
**Status:** Completed (2026-01-01) – shipped with Expedition Viewer Phase 1 + shared attendance tests

## Overview

Redesign the `/dashboard/events/attendance` page from a flat list/table to a more useful unit-centric card view.

## Current State

The current attendance page shows:
- A flat list/table of all attendees
- Grouping options: Single List, By Unit, By Unit & Event
- Collapsible sections for grouped views

**Problem:** The overview isn't very useful - users want to quickly see unit-level summaries.

## Proposed Changes

### 1. Attendance Overview Page (`/dashboard/events/attendance`)

**New Design:** Unit Summary Cards

Each card displays:
- **Unit name** (resolved from patrol cache)
- **People count** - number of unique members in that unit with "Yes" attendance
- **Events count** - number of events that unit has attendees for

**Interaction:** Clicking a card navigates to `/dashboard/events/attendance/[unitId]`

### 2. Unit Detail Page (`/dashboard/events/attendance/[unitId]`)

**Proposed UI Treatment:**

Option A: **Event-grouped accordion**
- Each event is a collapsible section header showing event name + date
- Expanded section shows list of attendees from that unit for that event
- Pros: Familiar pattern, easy to scan by event
- Cons: Can be tall if many events

Option B: **Timeline/calendar view**
- Events shown chronologically with attendee badges
- Pros: Visual timeline of participation
- Cons: More complex to implement

Option C: **Two-column layout** (Recommended)
- Left column: List of events (clickable)
- Right column: Attendees for selected event
- Shows unit name prominently at top
- Default: first event selected
- Pros: Easy navigation, clear data hierarchy
- Cons: Needs responsive handling for mobile

**Recommendation:** Start with Option A (event-grouped accordion) as it:
- Reuses existing Collapsible components
- Works well on mobile
- Aligns with current "By Unit & Event" grouping pattern

### 3. Mobile Considerations

- Cards stack vertically on mobile
- Unit detail accordion works naturally on mobile
- Back navigation to overview

## Implementation Tasks

1. [x] Create this tracking document
2. [x] Create unit summary card component (`UnitSummaryCard.tsx`)
3. [x] Create unit summary grid component (`UnitSummaryGrid.tsx`)
4. [x] Update attendance overview page with card grid
5. [x] Create unit detail page route (`/dashboard/events/attendance/[unitId]/page.tsx`)
6. [x] Implement event-grouped accordion for unit detail
7. [x] Add navigation between overview and detail (back button)
8. [x] Add automatic hydration hook (`useAttendanceHydration.ts`)
9. [x] Fix `usePrefetchEventSummary` to populate legacy cache key
10. [x] Add loading progress indicator to attendance page
11. [x] Make attendance overview the expedition home page (redirect from `/dashboard`)
12. [x] Add view toggle (By Event / By Attendee) to unit detail page
13. [x] Update tests (`attendance-by-person.feature`, shared Planner drill-down spec, step catalogue)

## Spec Updates Required

- `REQ-VIEW-*` requirements may need updates for new attendance views
- New requirement for unit summary cards
- New requirement for unit detail drill-down

## BDD Test Updates Required

- `attendance-by-person.feature` - update scenarios for new card-based overview
- Add scenario for unit card navigation
- Add scenario for unit detail view rendering

## Files to Modify

- `/src/app/dashboard/(expedition)/events/attendance/page.tsx` - Overview redesign
- `/src/components/domain/consolidated-attendance/` - New components
- `/tests/e2e/features/dashboard/attendance-by-person.feature` - Test updates
- `/docs/SPECIFICATION.md` - Requirement updates

## Notes

- Keep existing grouping helpers in `grouping.ts` - they're still useful
- The `useConsolidatedAttendance` hook provides the data we need
- Patrol/unit name resolution via `getPatrolName()` already works

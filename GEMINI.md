# SEEE Expedition Dashboard: Architectural Context

This document outlines the constraints and logic for the SEEE Expedition Dashboard. Use this context when reasoning about implementation strategy, debugging, or architectural decisions. 

**Gemini is to be used for planning only and should not attempt any implementation.**

## 1. The "Safety Shield" Philosophy
The primary constraint is protecting the upstream OSM API. [cite_start]The application acts as a defensive shield[cite: 9].
* [cite_start]**Rate Limiting:** We cap requests at 80% of the limit using `bottleneck`[cite: 110].
* **Circuit Breakers:**
    * [cite_start]**Soft Lock:** If quota hits 0, pause execution until reset[cite: 130].
    * [cite_start]**Hard Lock:** If `X-Blocked` is received, halt the entire system (503) for 1 hour[cite: 136].
* **Caching:** Two-layer strategy. [cite_start]TanStack Query (Client) + Vercel KV (Server Proxy Cache)[cite: 147].

## 2. Data Architecture
* [cite_start]**No Database:** We do not store personal data[cite: 8]. Vercel KV (Redis) is used *only* for:
    * Rate limit counters.
    * Configuration/Business Rules (Badge mappings).
    * Temporary API Response Caching.
* **Mocking:** All development uses local sanitized JSON files (`src/mocks/data/*.json`) generated from raw API dumps via `scripts/sanitize_data.py`.

## 3. Specific Data Structures
The OSM API returns data in two distinct patterns that we must handle:
* **Fixed Structure (`getBadge...`):** Standard data like "First Aid" (Badge ID 998).
* **Flexi Structure (`getFlexi...`):** User-defined columns.
    * We must first fetch `getFlexiRecordStructure` to understand the columns (e.g., "col_1" = "Tents").
    * We then fetch `getFlexiRecordData` and map it using the User's Config.

## 4. Initialization Flow
1.  [cite_start]**Startup:** App calls `getStartupData` to identify User Role and available Sections[cite: 38].
2.  [cite_start]**Selection:** If >1 section, show Section Picker Modal[cite: 38].
3.  [cite_start]**Hydration:** Once Section ID is set, fetch `getEvents`, then lazy-load details[cite: 79].

## 5. UI/UX Strategy
* [cite_start]**Readiness View:** Complex tables must support "Grouping" (e.g., by Patrol) using TanStack Table[cite: 19].
* **Mobile:** Tables of 10+ columns are banned on mobile. [cite_start]They must transform into "Participant Cards"[cite: 42].
* [cite_start]**Theme:** controlled via CSS variables in `globals.css` to allow easy "classy" theming[cite: 25].
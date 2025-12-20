 **SEEE Expedition Dashboard: Technical Architecture & Stack Strategy**

Version: 1.16

Date: 2024-10-26

Project: [SEEE Expedition Dashboard](https://docs.google.com/document/u/0/d/10qRMuIr1LhjyqIBaJ0Uad3iBWe8pLNkK--sykj4Jmaw/edit)

## **1\. Executive Summary**

This document defines the technical architecture for the SEEE Expedition Dashboard. The architecture is designed to strictly adhere to the project's unique constraints:

1. **Strict Read-Only/No-DB Policy:** No personal data is stored persistently outside of OSM.  
2. **Aggressive Rate Limiting:** The application acts as a "safety shield" between the user and the OSM API.  
3. **Modern Aesthetics:** Fulfilling the requirement for a "clean, classy" interface with theming support.

## **2\. Core Framework & Language**

| Component | Technology | Rationale |
| :---- | :---- | :---- |
| **Framework** | **Next.js 14+ (App Router)** | Provides a unified architecture for both the Frontend (UI) and the Backend (API Proxy). Its server-side capabilities are essential for hiding API tokens and enforcing rate limits. |
| **Language** | **TypeScript** | **Critical for Section 5.5 (Error Handling).** Strong typing ensures that unexpected data structures from OSM are caught at compile-time or runtime validation, rather than causing silent UI failures. |

## **3\. User Interface & Experience (UI/UX)**

*Addresses Section 6 (Non-Functional UI Requirements) & Section 3.5 (Readiness View)*

### **3.1 Component Library: shadcn/ui \+ Radix UI \+ TanStack Table**

* **Role:** The visual building blocks (Dropdowns, Dialogs, Data Tables, Tabs).  
* **Why Radix UI?** It provides the "Headless" accessibility logic (keyboard navigation, screen reader support) required for complex components like the **Unit Filter**.  
* **Why shadcn/ui?** It wraps Radix primitives in **Tailwind CSS**, providing the "classy, modern" aesthetic out of the box while allowing full control over the code.  
* **Why TanStack Table?** (Requirement 3.5) Essential for the **"Grouping"** requirements (Grouping by Patrol/Status). It provides the logic to transform flat data lists into grouped rows efficiently on the client side.  
* **Special Component: Column Mapping Dialog (Req 3.3):** A specialized Modal that triggers when the "Tier 2" validation detects ambiguity (e.g., multiple columns named "Team"). It allows the user to manually select the correct OSM column for "Walking Group" or "Tent Group" and saves this preference to Zustand.

### **3.2 Styling System: Tailwind CSS**

* **Role:** Responsive layout and design tokens.  
* **Feature:** Enables the "Theming Mechanism" (Section 6\) via CSS variables. Changing the "great theme" requires only updating a generic globals.css file, not rewriting components.

### **3.3 Icons: Lucide React**

* **Role:** Consistent, lightweight iconography for the interface (e.g., Status indicators, Tent icons, Kit icons).

### **3.4 Admin Management UI**

* **Role:** A dedicated, secure section for Administrators to manage the **Access Control List** without redeploying the app.  
* **Features:**  
  * **User Management Table:** Add/Remove email addresses.  
  * **Permission Editor:** Toggle between "Patrol-Based" and "Event-Based" strategies for each user.  
  * **Configuration Editor:** Interface to map "Business IDs" (e.g., Badge ID for 'First Aid') without touching code.  
  * **Factory Reset:** A "Reset to Defaults" action to restore the Business Rules to their original state if the configuration becomes corrupted.  
  * **Visual Feedback:** Toast notifications (via Sonner/shadcn) for successful updates.

### **3.5 Login & Section Selection Flow (Req 3.1)**

* **Login Flow:** At the start of the login process, the user is presented with a choice to select their intended role ("Administrator" or "Standard Viewer"). This selection determines which OAuth provider is used for authentication.
  * **Implementation:** The application registers **two separate OAuth providers** with NextAuth:
    * `osm-admin` - Requests 4 scopes: `section:event:read`, `section:member:read`, `section:programme:read`, `section:flexirecord:read`
    * `osm-standard` - Requests 1 scope: `section:event:read`
  * **Flow:** When user clicks "Sign in with OSM", the frontend calls `signIn('osm-admin')` or `signIn('osm-standard')` based on their role selection
  * **OAuth Callbacks:** Each provider has a unique callback URL that must be whitelisted in OSM:
    * Administrator: `/api/auth/callback/osm-admin`
    * Standard Viewer: `/api/auth/callback/osm-standard`
  * **Role Persistence:** The selected role is embedded in the user profile during OAuth callback and stored in the JWT token
* **Section Selection:** The application uses a single active section (`currentSection`).
  - If `currentSection` is present (persisted), the dashboard shell renders immediately and data loads for that section.
  - If `currentSection` is missing, the section selector must render immediately and the normal dashboard shell must not render first (no-flash gating).
* **Components:**
  - **Full-screen section selector**: used only when there is no selected section.
  - **Inline dropdown section switcher**: used when a section is already selected (instead of a full-screen modal).
* **Persistence:** The selected `section_id` and the determined `userRole` are stored in the **Zustand Session Store** (see 4.2) to persist across reloads.

### **3.6 Mobile Responsiveness Strategy (Req 6\)**

Tables with 10+ columns (Readiness View) are unusable on mobile. To satisfy the "seamless" requirement:

* **Strategy:** **"Table-to-Card Transformation"**.  
* **Implementation:** CSS Media Queries (hidden md:table) hide the \<table\> on mobile and reveal a grid of **Participant Cards**.  
* **Card Content:** Each card displays the Member Name as the header, with key stats (First Aid, Status) as icons/badges. Tapping the card expands it to show the full "Row" data (Training Modules).

## **4\. State Management Strategy**

*Addresses Section 3.3 (Logistics View) & Section 5.1 (Performance)*

The application employs a **Split-State Architecture** to handle data efficiently without a database.

graph TD

    subgraph Client \[Browser\]

        UI\[shadcn/ui \+ Radix UI\]

        

        subgraph State\_Management

            TQ\[TanStack Query\] \-- Manages \--\> APIData\[Events, Members, Patrols\]

            Zustand\[Zustand Store\] \-- Manages \--\> LocalSettings\[Column Mappings, Theme Prefs, User Role\]

        end

        

        UI \-- 1\. Fetch List \--\> TQ

        TQ \-- 2\. Render Shell \--\> UI

        UI \-- 3\. Fetch Details (Per Item) \--\> TQ

        UI \-- Reads Settings \--\> Zustand

    end

    subgraph Backend \[Next.js Server\]

        API\[API Routes\]

    end

    TQ \-- Fetches \--\> API

    Zustand \-- Persists to \--\> Storage\[Local Storage (non-sensitive prefs only)\]

### **4.1 Server State: TanStack Query (React Query)**

* **Purpose:** Manages data fetched from the OSM API via the `/api/proxy` safety shield (Events, Members, etc.).  
* **Behavior:** Handles caching, request deduplication, cancellation, and loading states.  
* **Decision (Dec 2025)**: For expensive multi-call resources (notably Members), prefer an **orchestrated pipeline** approach (a single query per section that progressively enriches data and writes incremental updates into the query cache) rather than spawning hundreds of per-member queries.
* **Guardrails (Dec 2025)**:
  * **Cancellation:** Query functions must support `AbortSignal` so section changes abort in-flight work.
  * **Retries:** Retry must be disabled or tightly constrained for proxy failures:
    * `401` unauthenticated: no retry.
    * `429` soft lock / cooldown: no retry (or at most a single delayed retry).
    * `503` hard lock: no retry.
  * **Sensitive data:** React Query cache must remain **in-memory only** (no persistence plugin).
* **Derived State Calculation (Req 3.3):** The "First Aid Readiness Summary" (e.g., "20/25 Qualified") is calculated efficiently on the client side using Memoized Selectors within TanStack Query, preventing expensive re-renders.

### **4.2 Client State: Zustand**

* **Purpose:** Manages local user preferences and ephemeral configuration.  
* **Specific Use Cases:**  
  * **Session Context:** Stores `currentSection` (selected section) and `userRole` (Admin/Standard).
    - `currentSection` is persisted (non-sensitive) to support restoring the user’s last selection on refresh.
    - When `currentSection` is absent, the UI must gate the dashboard shell and render the section selector immediately (no-flash).
    - The `userRole` determined during login is critical for driving UI visibility of Admin controls and influencing data sourcing strategies.
  * **Column Mapping (Section 3.3):** Stores the user's manual mapping of "Walking Grp" columns for the current session.  
  * **Readiness Filters (Section 3.5):** Remembers that the user wants to see "Patrol A" and "Bronze Events" so the view doesn't reset on refresh.  
* **Persistence:** Configured to persist to localStorage for **non-sensitive** settings so preferences survive a page reload.

**Important**: Server-derived datasets containing sensitive information (e.g., member contact/medical data) must not be persisted to localStorage.

### **4.3 Progressive Hydration Strategy**

To handle users with access to large datasets without blocking the UI or triggering rate limits immediately, the application follows a **"Shell First" Waterfall Strategy**:

1. **Phase 1: Index Fetch:** The first API call fetches *only* the Event Index (ID, Name, Date).  
2. **Phase 2: Skeleton Render:** The UI immediately renders a "Skeleton" card for every event in the index.  
3. **Phase 3: Lazy Detail Fetch:** Detailed data (Participants, Structure, Config) is fetched individually for each event via throttled queues.

### **4.4 Summary View Batching**

For the **Readiness View (Section 3.5)**:

* **Logic:** The frontend initiates a **Batched Loading Sequence**. It requests event details in chunks (e.g., 3 events at a time).  
* **UX:** A progress bar ("Loading Event Data 3/12...") is displayed instead of a generic spinner.

## **5\. Backend & API Safety Layer**

*Addresses Section 5.1 (Rate Limiting) & Section 5.5 (Error Handling)*

The frontend **never** communicates with OSM directly. All traffic is routed through a secure proxy layer designed to "Fail Fast" and protect the API.

graph LR

    User\[User Browser\] \-- 1\. Request Dashboard \--\> NextJS\[Next.js Server API\]

    

    subgraph "Safety Layer"

    NextJS \-- 2\. Check Lock \--\> RedisLock{Global Lock?}

    RedisLock \-- "HARD LOCK (X-Blocked)" \--\> NextJS\[Abort 503\]

    RedisLock \-- "SOFT LOCK (Quota 0)" \--\> NextJS\[Abort 429\]

    RedisLock \-- "NO" \--\> Cache\[Check Cache\]

    Cache \-- Miss \--\> Limiter\[Bottleneck\]

    end

    

    Limiter \-- 3\. Request \--\> OSM\[OSM API\]

    OSM \-- 4\. Response \+ Headers \--\> Limiter

    Limiter \-- 5\. Inspect Headers \--\> NextJS

    NextJS \-- 6\. Validate Data \--\> NextJS

### **5.1 API Proxy: Next.js API Routes**

* **Role:** Acts as the intermediary. It holds the OAuth Client Secret.  
* **Method Whitelist:** API Routes interacting with OSM are strictly **GET** only (Read-Only). The only POST routes allowed are for internal Admin Configuration updates.

### **5.2 Rate Limiting Engine: Bottleneck**

* **Role:** Job scheduler and rate limiter.  
* **Internal Throttling:** Caps outgoing requests to 80% of OSM's allowed limit.  
* **Retry-After:** Automatically detects 429 headers and pauses execution.

### **5.3 Data Validation: Tiered Strategy (Resolving Req 3.3 vs 5.5)**

To balance "Fail Fast" with "Graceful Degradation":

* **Tier 1: Strict Core Schema:** (Event ID, Member Name, Patrol). If these are invalid/missing, Zod throws an error and the UI displays a "Data Error" state. This satisfies Req 5.5.  
* **Tier 2: Permissive Logistics Schema:** (Tent Group, Walking Group). These fields are marked optional() or nullable(). If data is missing or malformed, Zod returns null, and the UI simply hides that column. This satisfies Req 3.3.

### **5.2 Security & Access Control**

* **User Roles:** The system will distinguish between two classes of users:  
  * **Administrator:** A user explicitly defined in the configuration who has authority to **set** access limits. Administrators have unrestricted view of all events and patrols by default. **Upon successful login, an Administrator will also trigger an automatic refresh of the cached Patrol and Member structure data (see Section 7).**
  * **Standard Viewer:** A user whose view is restricted by the limits defined by an Administrator.  
* **Access Control Strategies:** The configuration must support two distinct restriction models for Standard Viewers:  
  * **Strategy A: Patrol-Based Restriction (Vertical Slicing):**  
    * *Use Case:* Unit Leaders who need to see their own members across all events.  
    * *Behavior:* The user can see **All Events**, but the participant list is permanently filtered to show **only members of specific Patrols** (e.g., "Borestane ESU").  
  * **Strategy B: Event-Based Restriction (Horizontal Slicing):**  
    * *Use Case:* An Expedition Leader running a specific trip who needs to see all attendees regardless of Unit.  
    * *Behavior:* The user can see **All Patrols/Members**, but only for **specific Events** (e.g., "Bronze Practice 2025").  
* **Configuration Mechanism:**  
  * The mapping of User \-\> Strategy \-\> `Patrol IDs OR Event IDs` will be stored in the internal **User Configuration List** (JSON config/Environment Variable).  
  * If a user is not listed in the configuration, they are denied access by default (Whitelist approach).

* **Storage:** The **User Configuration List** is stored in **Vercel KV (Redis)**.  
* **Role Propagation:** When the Access List is read, the backend returns the User's Role (admin or viewer). This is stored in Zustand to conditionally render the "Admin Settings" button in the UI.

### **5.6 Logging & Observability (Req 5.4)**

* **Tool:** pino (Node.js structured logger).  
* **Header Capture:** Logs X-RateLimit-Remaining and X-RateLimit-Limit.  
* **Alerting:** X-Blocked triggers a Critical Log.

### **5.7 Token Rotation & Session Maintenance**

* **Solution:** Auth.js (NextAuth) refresh\_token rotation strategy is implemented to handle OSM's 1-hour token expiry seamlessly.

### **5.8 Circuit Breaker: Two-Stage Kill Switch (Req 5.5 & RateLimit Headers)**

The system implements a centralized locking mechanism in **Vercel KV** to handle limits across distributed serverless functions.

#### **Stage 1: Soft Lock (Quota Exhaustion)**

* **Trigger:** Any API response where X-RateLimit-Remaining \== 0.  
* **Action:** Write key OSM\_API\_PAUSE to Vercel KV.  
* **Duration (TTL):** Calculated dynamically: (X-RateLimit-Reset Timestamp) \- (Current Timestamp).  
* **Effect:** All requests from all users are paused until the reset time. The UI displays a "System Cooling Down" message with a countdown.

#### **Stage 2: Hard Lock (Global Block)**

* **Trigger:** Any API response containing X-Blocked or X-Deprecated.  
* **Action:** Write key OSM\_GLOBAL\_BLOCK to Vercel KV.  
* **Duration (TTL):** 1 Hour (default safety window).  
* **Effect:** **Total System Halt.** All API requests return 503 immediately. This prevents the application from making the situation worse and requires Admin intervention to investigate the logs.

## **6\. Storage Technology Selection Rationale**

To prevent architecture drift, the following table explicitly documents why **Vercel KV (Redis)** was chosen over alternatives like **Vercel Edge Config** or **Blob**.

| Requirement | Why Vercel KV (Selected) | Why Edge Config (Rejected) | Why Blob (Rejected) |
| :---- | :---- | :---- | :---- |
| **Rate Limiting (Req 5.1)** | **Essential:** Supports atomic counters (INCR) required for real-time request tracking. | **Fatal:** Cannot handle atomic counters. Designed for infrequent read-heavy data. | **Fatal:** Too slow and lacks atomic operations. |
| **Global Kill Switch (Req 5.5)** | **Essential:** Propagates writes instantly (\<10ms) to stop blocked traffic immediately. | **Risk:** Updates take 10-15s to propagate globally. This delay could result in a permanent ban. | **Fatal:** Propagation is too slow (60s+). |
| **Admin Config Updates** | **Good:** Updates via API are fast and cheap. | **Poor:** Write operations are strictly rate-limited and metered. | **Poor:** Overkill for small JSON objects. |
| **Local Testing (Req 10.4)** | **Excellent:** Uses standard Redis protocol (Docker compatible). | **Poor:** Proprietary technology; requires mocking or internet connection. | **Poor:** Difficult to emulate locally. |

## **7\. Two-Layer Caching Strategy**

*Addresses Section 4.1 (Master Data Source) & Section 5.1 (Caching)*

To ensure speed for the user and protection for the API (Section 5.1), the application implements a strict **Two-Layer Caching Strategy**.

### **Layer 1: The "Instant" Layer (Client-Side)**

* **Technology:** **TanStack Query (React Query)**  
* **Settings:** Dataset-specific. Expensive datasets (e.g., members) should use long `staleTime` and typically disable `refetchOnWindowFocus`.

### **Layer 2: The "Safety" Layer (Server-Side)**

* **Technology:** **Vercel KV (Redis)**  
* **Logic:** Acts as a cache for API responses. Even on page refresh, data is served from Redis if available.

### **Specific Data Expiry Policies (TTL)**

| Data Type | TTL (Time-To-Live) | Rationale |
| :---- | :---- | :---- |
| **Access Control List** | **NO EXPIRY** | Configuration data must persist until manually changed. |
| **Patrol and Member Structure** | **90 Days** | Critical for Standard Viewers (who cannot fetch directly), changes infrequently. Automatically refreshed when an Administrator logs in. |
| **Static Data** (Events Lists, general non-critical Member Lists for Admins) | **1 Hour** | Membership rarely changes during an event. |
| **Volatile Data** (Invites, Kit Lists, specific event details) | **5-10 Minutes** | Balances the need for updates with API protection. |
| **OAuth Tokens** | **1 Hour** | Matches the OSM Token expiry lifecycle. |

## **8\. Reporting & Export**

*Addresses Section 3.6 (Reporting)*

### **8.1 PDF Generation: React-PDF**

* **Why:** Allows building the PDF report using React components for consistent styling.

### **8.2 Spreadsheet Export: SheetJS (xlsx)**

* **Why:** Robust library for generating .xlsx files client-side.

## **9\. Development & Strategy Patterns**

*Addresses Section 5.3 (Mock Data Layer) and Open Question 1 (Training Data)*

### **9.1 Repository Pattern**

* **LiveOsmProvider**: Real implementation calling OSM API.  
* **MockFileProvider**: Implementation reading from local JSON files.

### **9.2 Training Data Adapter (Req 1.0 \- Open Question)**

* **Pattern:** Adapter pattern with BadgeRecordAdapter and FlexiRecordAdapter implementations, selectable via Admin Config.

### **9.3 Environment Toggle**

* DATA\_SOURCE=mock environment variable.

## **10\. Business Rules Configuration**

*Addresses Req 3.4 (7 Modules) and Auto-Detection Defaults*

### **10.1 Configuration Lifecycle & Seeding**

* **Auto-Seed (File-Based):** If Redis is empty, the app reads src/config/defaults.json to populate the initial Business Rules.  
* **Factory Reset:** Admin UI button to reload src/config/defaults.json, overwriting any corrupted Redis config.

### **10.2 Business Rules Map (Updated)**

* **Structure:**

{

  "training\_modules": {

    "module\_1": { "label": "Navigation", "osm\_badge\_id": 4421, "osm\_flexi\_field": "col\_2" },

    "module\_2": { "label": "Camping", "osm\_badge\_id": 4422, "osm\_flexi\_field": "col\_3" }

  },

  "first\_aid": { "osm\_badge\_id": 998, "validity\_years": 3 },

  "default\_column\_mappings": {

    "walking\_group": \["Walking Group", "Expedition Group", "Team", "Activity Group"\],

    "tent\_group": \["Tent Group", "Tents", "Accommodation", "Sleeping"\],

    "kit\_provider": \["Group Gear Provider", "Kit", "Equipment", "Q Store"\],

    "additional\_info": \["Additional Info", "Notes", "Comments", "Medical"\]

  }

}

* 

## **11\. Quality Assurance & Testing Strategy**

*Addresses Requirement 5.3 (Mock Data) and 5.5 (Fail Fast Stability)*

### **11.1 Unit & Component Testing**

* **Stack:** **Jest** \+ **React Testing Library**.  
* **Focus:**  
  * **Zod Validation Logic:** Verify that Tier 1 errors crash the app safely, while Tier 2 errors result in graceful degradation (null fields).  
  * **Business Rules:** Test that the Adapter Pattern correctly parses "Flexi" vs "Badge" data based on the injected configuration.

### **11.2 Network Simulation & Integration Testing**

* **Stack:** **MSW (Mock Service Worker)**.  
* **Role:** Intercepts network requests during tests to simulate OSM API behavior without hitting the real endpoints.  
* **Critical Scenarios:**  
  * **Simulate Block:** Force an X-Blocked header response to verify the "Circuit Breaker" (Section 5.8) activates and locks the system.  
  * **Simulate Rate Limit:** Force X-RateLimit-Remaining: 0 to verify that Bottleneck queues or pauses requests correctly.

### **11.3 End-to-End (E2E) Testing**

* **Stack:** **Playwright**.  
* **Focus:**  
  * **Auth Flow:** Verify the "Section Selection" modal appears for multi-section users.  
  * **Admin features:** Verify that the "Reset Defaults" button successfully re-seeds the Vercel KV store from the file system.

### **11.4 Local Infrastructure Emulation (New)**

Since the application relies on Vercel KV (Redis) for critical functions (Rate Limiting, Config, Caching), local testing must duplicate this environment.

* **Stack:** **Docker** \+ **Docker Compose**.  
* **Approach:** "Infrastructure Twin".  
  * The application code connects to a generic REDIS\_URL.  
  * **Development:** docker-compose.yml spins up a standard Redis container exposed on port 6379. The .env.local file points REDIS\_URL to redis://localhost:6379.  
  * **Production:** The environment variable points to the Vercel KV endpoint.  
* **Benefit:** Allows offline testing of "Persistent Config" and "Rate Limit Queueing" logic without mocking the database client or requiring an internet connection.


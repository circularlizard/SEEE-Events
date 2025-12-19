# **SEEE Expedition Dashboard**

Version: Draft 21

Status: In progress

## **1\. Open Questions & Pending Decisions**

Before final implementation, the following strategic decisions must be resolved:

* **Training Data Source:** Will training module completion be tracked via a single manual "Flexi-record" or by linking to "Badge Records" (Official or Custom)?  
  * *Impact:* Determines API complexity and required permissions.  
* **Access Control Configuration:** Which Access Control Strategy (Patrol-based vs. Event-based) will be the default for Standard Viewers?  
  * *Impact:* Determines how the User Configuration List is populated and maintained.

* **TanStack React Query Migration Approach (Resolved):** The implementation plan has selected an orchestrated pipeline approach with progressive enrichment for members data.
  * *Reference:* `docs/members-and-sessions-plan.md` (Section 8).

## **2\. Project Overview**

**Goal:** Develop a read-only web-based dashboard that automates the display of Explorer Scout expedition data for the South East Edinburgh Explorers (SEEE).

**Problem Solved:** Currently, Unit Leaders lack visibility into which of their Explorers are attending expeditions, their training status, and kit requirements. Granting full OSM administrative access to all leaders poses GDPR risks; manual spreadsheets are labour-intensive.

**Target Audience:** Unit Leaders (viewing data for their specific Explorers) and SEEE Administrators (managing the data).

## **3\. Functional Requirements**

### **3.1 Authentication & Section Selection**

* **Protocol:** The application will use **OSM OAuth 2.0 (Authorization Code Flow)**.  
  * *Rationale:* This is the mandatory standard for multi-user applications interfacing with OSM.  
* **Login Method:** Users will authenticate using their existing **Personal OSM Credentials**.  
* **Role Selection:** At the start of the login process, the user must select their intended role ("Administrator" or "Standard Viewer"). This selection determines the OAuth scopes requested.
* **Scopes:** The application requests permissions based on the selected role:
  * **Administrator:** Requires broader access to manage data and cache member structures.
    * `section:event:read`
    * `section:member:read`
    * `section:programme:read`
    * `section:flexirecord:read`
  * **Standard Viewer (Unit/Expedition Leader):** Requires minimal access for viewing events.
    * `section:event:read`
* **Section Selection:** Upon successful login, if a user has access to multiple OSM sections (e.g., different Units or Regional levels), they must be presented with a choice to select which Section they wish to view.

**Implementation alignment (Dec 2025)**:

* **Single-section selection:** The application must treat one `currentSection` as active at a time.
* **Primary control location:** Section selection controls live in the **sidebar** (desktop), with a compact mobile affordance in the header.
* **No-flash requirement:** Multi-section users without a remembered selection must be routed to the section picker **before** the main dashboard content renders.

### **3.1.1 Session timeout**

* **Requirement:** If the user is inactive for 15 minutes and their NextAuth/OSM session has expired, they must be redirected to login.
* **Callback behavior:** After re-authentication, the user should return to the page they were on.

### **3.2 Event Dashboard**

* **Scope:** The dashboard will display **active and future events only**. Historical data is out of scope.  
* **Event Listing:** Display a list of upcoming expedition events fetched from the selected OSM section.  
* **Participant Status:** For a selected event, display:  
  * Participant Name  
  * Invitation Status (Invited, Accepted, Declined)  
* **Unit Filtering:**  
  * The interface must provide a "Unit Filter" dropdown.  
  * **Logic:** Filter participants based on their "Patrol" field in OSM, which currently stores the Unit/ESU name (e.g., "Borestane ESU", "Tweed Glen ESU")

**Routes (canonical):**

* Event dashboard: `/dashboard/events`
* Event attendance: `/dashboard/events/attendance`

### **3.3 Expedition Logistics View**

### For each event, the dashboard must display logistical details.

* **Dynamic Column Mapping (Configuration Step):**  
  * Since custom columns in OSM are defined per event and may have different names (e.g., "Walking Grp" vs "Expedition Group"), the dashboard cannot assume fixed column names.  
  * **Requirement:** When a user selects an event, the system must allow them to map the available OSM columns to the dashboard fields (Walking Group, Tent Group, etc.) if they are not automatically detected.  
* **Graceful Degradation:**  
  * If the specific columns (Expedition Group, Tent Group, etc.) are **missing or unmapped** for an event, the application must **not fail**.  
  * **Behavior:** It should display the participant list and invitation status (which are standard fields) and simply hide or gray out the missing logistics columns for that specific event.  
* **Data Fields to Display (Per Participant):**  
  * **Expedition Group:** The walking group ID (e.g., H-SP1-A).  
  * **Tent Group:** The specific tent assignment ID (e.g., H-SP1-A-3).  
  * **Group Gear Provider:** A **free-text label** identifying who is providing the kit. This is not a linked user ID.  
  * **Additional Info:** A free-text field for ad-hoc notes.  
* **First Aid Readiness Summary (New):**  
  * **Requirement:** A high-level summary of First Aid qualification must be displayed for all participants attending the selected expedition event.  
  * **Content:** The summary should indicate the overall status, such as a count or percentage of attendees with a current First Aid qualification (e.g., "20/25 Participants are First Aid Qualified").  
  * **Data Source:** The status is derived from the First Aid qualification field detailed in Section 3.4.

### 

### **3.4 Readiness & Training View**

To ensure compliance before an expedition, the dashboard must verify completion of the 7 required Explorer training modules and First Aid.

* **Open Question: Data Source Strategy**  
  * The method for retrieving this data is currently undefined and requires a decision, as it impacts API permissions and complexity.  
  * **Option A: Flexi-Record:** Data is stored in a single manual "Flexi-record" (as currently done).  
    * *Pros:* Simpler API call (fetching a custom field).  
    * *Cons:* Requires continued manual data entry by admins.  
  * **Option B: Badge Records:** Data is retrieved directly from the OSM Badge system (linking to the specific training requirements).  
    * *Note:* This may utilize **Official Badges** or **Custom Badges** created specifically for the region to track these modules.  
    * *Pros:* Automates verification against official records.  
    * *Cons:* Requires different/elevated API permissions to read Badge data; more complex API logic to parse specific module completion.  
* **Requirement:** The dashboard must be built to support one of these methods once the decision is finalized. For now, the UI must simply display a status (Yes/No/Date) for each module.  
* **First Aid:** Display current First Aid qualification status

### **3.5 Member Participation & Readiness Summary View**

* **Scope:** A consolidated, at-a-glance view aggregating participation data and training readiness across all available active/future events and members in the region.  
* **Data Matrix:**  
  * **Rows:** Individual Members.  
  * **Columns:** Events (displaying status: Invited/Accepted/Declined) **AND** Training Readiness Status.  
* **Training Readiness Display:**  
  * The view must incorporate the training data defined in Section 3.4.  
  * For each member, display the completion status (Yes/No/Date) for the **7 required Explorer Training Modules** and **First Aid qualification**. These will appear as dedicated columns next to the event participation status.  
* **Grouping:**  
  * The view must provide options to **group members** to facilitate analysis.  
  * **Primary Grouping:** **By Patrol**. This enables a Unit Leader to view their entire Unit as a contiguous block, seeing attendance and training completion at a glance.  
  * **Secondary Grouping (Optional):** By Invitation Status (e.g., group all "Accepted" members together) or by a key Training Status (e.g., group all members without First Aid).  
* **Filtering:**  
  * The view must allow users to include or exclude specific data points:  
  * **Event Filtering:** Users must be able to select specific events to include in the columns (e.g., "Show only Bronze Qualifying events").  
  * **Patrol Filtering:** Users must be able to filter the rows to show only members belonging to specific Patrols.  
  * **Readiness Filtering (New):** Users must be able to filter the rows based on training status (e.g., "Show only members who have completed all 7 modules" or "Show only members who need First Aid").  
* **Sorting:**  
  * The view must be sortable by **Member Name**, **Patrol**, and potentially by **Training Status** (e.g., sort by First Aid status).  
* **Access Control:**  
  * The visible data is strictly limited by the rules defined in Section 5.2.

### **3.6 Reporting & Export**

To support offline analysis and physical record-keeping during expeditions:

* **Spreadsheet Export:**  
  * Users must be able to download the currently displayed participation data (either from the Event Dashboard or Summary View) as a **CSV** or **Excel (.xlsx)** file.  
  * The export must respect current filters (e.g., if filtered to "Borestane ESU", only those records are exported).  
* **PDF Report Generation:**  
  * Users must be able to generate a **well-formatted PDF report** of the current view.  
  * **Formatting:** The PDF should be styled for readability (e.g., table layouts, clear headers) and suitable for printing to take on expeditions.  
  * **Content:** Like the spreadsheet, the PDF must reflect the currently applied filters and access controls.

### **3.7 Admin: Members views & data quality**

* **Scope:** Administrator-only views for exploring member datasets and identifying data quality issues.
* **Members list view:**
  * Administrators must be able to view a sortable list of members for the selected section.
  * The list must support **progressive enrichment**: a usable list appears quickly, with member detail fields populating incrementally.
* **Member data issues view:**
  * Administrators must be able to view derived issue categories, including:
    * Missing/incomplete member contact information.
    * Missing/incomplete other contacts.
    * Missing doctor information.
    * Emergency contact duplicates a primary contact.
* **Security:** Member contact/medical data is sensitive and must not be persisted to localStorage.

**Routes (canonical, admin only):**

* Members list: `/dashboard/members`
* Member data issues: `/dashboard/members/issues`

## **4\. Data Management Strategy**

### **4.1 Master Data Source**

* **Online Scout Manager (OSM)** is the single source of truth.  
* **Read-Only Application:** The application is strictly read-only. Any corrections (e.g., changing a tent group or updating training) must be done by an administrator directly in OSM.  
* **Patrol & Member Data Caching:**
  * Because Standard Viewers (Unit Leaders) only have `section:event:read` permission, they cannot directly fetch member or patrol lists from OSM.
  * **Strategy:** An **Administrator** must fetch the Patrol and Member structure. This data is cached for a long duration and served to Standard Viewers to allow them to see which Patrols participants belong to.
* No external database will be used for persistent storage of personal data.

**Implementation alignment (Dec 2025)**:

* **Members detail sensitivity:** Member contact/medical details must be treated as sensitive and must remain **in-memory only** on the client.
* **Client caching strategy:** Server-derived datasets are moving toward TanStack React Query as the source of truth for client caching, with progressive enrichment for members.

### **4.2 Custom Data Fields**

The application relies on data stored in OSM "User Data" columns within the Event "People" tab. The system supports flexibility in naming, but expects data for:

* Expedition Group (Text)  
* Tent Group (Text)  
* Group Gear Provider (Free Text Label)  
* Additional Info (Text)

## **5\. Technical Architecture**

### **5.1 Backend/API & Rate Limiting Strategy**

* **Conservative Rate Limiting:** OSM aggressively blocks applications that exceed limits or behave erratically. The application must implement a strict, defensive strategy:  
  * **Header Monitoring:** The app must read and respect the X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers on every response.  
  * **Internal Throttling:** The app must implement an internal rate limit that is **lower** than the OSM limit (e.g., if OSM allows 100/min, the app should self-cap at 80/min) to provide a safety buffer.  
  * **Respect Retry-After:** If an HTTP 429 is received, the app must strictly adhere to the Retry-After header.  
  * **Caching:** To reduce API load, extensive caching (e.g., via Vercel KV or in-memory) must be used for non-volatile data (e.g., Event lists, Member lists).

**Implementation alignment (Dec 2025)**:

* **Safety shield boundary:** All client requests must go via the proxy layer (`/api/proxy/...`).
* **Avoid aggressive retries:** Client retry behavior must be disabled or tightly constrained for `401` (unauthenticated), `429` (cooldown), and `503` (halt) responses.
* **Cancellation support:** Client fetch helpers should accept `AbortSignal` so section changes can abort in-flight work.

### **5.2 Security & Access Control**

* **User Roles:** The system will distinguish between two classes of users:  
  * **Administrator:** A user explicitly defined in the configuration who has authority to **set** access limits. Administrators have unrestricted view of all events and patrols by default.  
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

### **5.3 Testing & Mock Data Layer**

* **Mock Data Layer:** To ensure reliable testing and development without constant reliance on the live OSM API (and to avoid throttling during dev), the architecture must include a distinct mock data layer.  
* **Data Population:** This layer must be populated with static JSON files containing realistic example data captured from actual OSM API calls (anonymized where necessary).  
* **Configuration:** It must be possible to toggle between "Live" and "Mock" data providers via a simple environment variable configuration (e.g., USE\_MOCK\_DATA=true).

### **5.4 Logging & Observability**

* **Requirement:** Extensive logging must be implemented to allow administrators to diagnose connection issues and monitor API usage.  
* **Scope:** Logging must cover:  
  * All internal API function calls.  
  * **Upstream API Traffic:** Full logging of requests sent to and responses received from the OSM API.  
  * **Headers:** Crucially, this must include **Request and Response Headers** to aid in debugging authentication errors and monitoring Rate Limit headers returned by OSM.  
  * **Blocking Indicators:** Explicitly log occurrences of X-Blocked or X-Deprecated headers.  
* **Configuration:** The logging level and behavior must be centrally configurable (e.g., via environment variables), allowing administrators to enable verbose logging (headers/body) or restrict it to errors only.

### **5.5 Error Handling & Stability**

* **Intolerance to Failure:** The API layer must be designed to **fail fast** rather than retry blindly, to prevent triggering OSM's automated blocking systems.  
* **Critical Stop Conditions:**  
  * **X-Blocked Header:** If the X-Blocked header is detected, the application must immediately suspend all further API calls and alert the administrator.  
  * **Unexpected Responses:** If the API returns data in an unexpected format or invalid structure, the application must abort the operation rather than attempting to parse or re-request.  
* **Input Sanitization:** All data sent to OSM (even read parameters) must be strictly validated and sanitized before transmission to prevent malformed requests.

I have added a new section to the document for the UI's non-functional requirements. This new section is placed as Section 6\.

## **6\. Non-Functional UI Requirements**

* **Aesthetics & Theme:**  
  * The User Interface must be **clean, classy, and modern** in design.  
  * Selection of **great fonts** and a **good colour palette** is critical to the professional feel.  
* **Theming & Customization:**  
  * The application must incorporate a **theming mechanism** to allow for easy, high-level changes to the colour palette and overall look without major code changes.  
  * A default "great theme" will be selected.  
* **Responsiveness:**  
  * The UI must be fully **responsive**, ensuring it provides a seamless and correct user experience across various screen sizes and devices (desktops, tablets, mobile phones).


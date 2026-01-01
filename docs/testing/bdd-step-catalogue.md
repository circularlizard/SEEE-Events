# BDD Step Catalogue

_Generated automatically via `node scripts/check-bdd-steps.mjs --catalog` on 2025-12-31T00:17:34.192Z._

## New Steps Added (2026-01-01)

The following steps were added to support the Expedition Viewer attendance redesign and Planner shared component scenarios:

### Sidebar Navigation
| Step Text | Implementation | Feature Usage |
| --- | --- | --- |
| I click the sidebar link {string} under {string} | When – `tests/e2e/steps/shared.steps.ts` | `tests/e2e/features/dashboard/events-list.feature` |

### Unit Summary Cards (Attendance Overview)
| Step Text | Implementation | Feature Usage |
| --- | --- | --- |
| the attendance overview should display unit summary cards | Then – `tests/e2e/steps/attendance.steps.ts` | `tests/e2e/features/dashboard/attendance-by-person.feature` |
| each unit card should show patrol name, attendee count, and event count | Then – `tests/e2e/steps/attendance.steps.ts` | `tests/e2e/features/dashboard/attendance-by-person.feature` |
| I click on a unit summary card | When – `tests/e2e/steps/attendance.steps.ts` | `tests/e2e/features/dashboard/attendance-by-person.feature` |
| I should be on a unit detail page | Then – `tests/e2e/steps/attendance.steps.ts` | `tests/e2e/features/dashboard/attendance-by-person.feature` |

### Unit Drill-down (Accordion, Toggle, Indicators)
| Step Text | Implementation | Feature Usage |
| --- | --- | --- |
| the unit detail page should display event accordion sections | Then – `tests/e2e/steps/attendance.steps.ts` | `tests/e2e/features/dashboard/attendance-by-person.feature` |
| I should see a view toggle for By Event and By Attendee | Then – `tests/e2e/steps/attendance.steps.ts` | `tests/e2e/features/dashboard/attendance-by-person.feature` |
| I should see a cache freshness indicator | Then – `tests/e2e/steps/attendance.steps.ts` | `tests/e2e/features/dashboard/attendance-by-person.feature` |
| I should see a hydration progress indicator | Then – `tests/e2e/steps/attendance.steps.ts` | `tests/e2e/features/dashboard/attendance-by-person.feature` |

---

## Legacy Steps

| Step Text | Implementations | Feature Usage |
| --- | --- | --- |
| I am logged in as a standard viewer | Given – `tests/e2e/steps/shared.steps.ts:99` | _(unused)_ |
| I am logged in as an admin | Given – `tests/e2e/steps/shared.steps.ts:70` | `tests/e2e/features/auth/login.feature:42`<br>`tests/e2e/features/auth/login.feature:53`<br>`tests/e2e/features/dashboard/attendance-by-person.feature:8`<br>`tests/e2e/features/dashboard/event-detail.feature:8`<br>`tests/e2e/features/dashboard/events-list.feature:8`<br>`tests/e2e/features/members/member-issues.feature:8`<br>`tests/e2e/features/members/members-list.feature:8` |
| I am on the login page | Given – `tests/e2e/steps/shared.steps.ts:128` | `tests/e2e/features/auth/login.feature:8`<br>`tests/e2e/features/multi-app-routing.feature:16` |
| I click "Administrator" | _(missing)_ | `tests/e2e/features/auth/login.feature:18`<br>`tests/e2e/features/auth/login.feature:34`<br>`tests/e2e/features/auth/login.feature:47` |
| I click "Standard Viewer" | _(missing)_ | `tests/e2e/features/auth/login.feature:24` |
| I click {string} | When – `tests/e2e/steps/shared.steps.ts:154` | _(unused)_ |
| I click the button "Sign in with OSM" | _(missing)_ | `tests/e2e/features/auth/login.feature:19`<br>`tests/e2e/features/auth/login.feature:25`<br>`tests/e2e/features/auth/login.feature:35`<br>`tests/e2e/features/auth/login.feature:48` |
| I click the button {string} | When – `tests/e2e/steps/shared.steps.ts:158` | _(unused)_ |
| I have selected the {string} section | Given – `tests/e2e/steps/shared.steps.ts:134` | _(unused)_ |
| I navigate to "/dashboard" | _(missing)_ | `tests/e2e/features/auth/login.feature:12`<br>`tests/e2e/features/auth/login.feature:54` |
| I navigate to "/dashboard/events" | _(missing)_ | `tests/e2e/features/auth/login.feature:27`<br>`tests/e2e/features/auth/login.feature:32`<br>`tests/e2e/features/auth/login.feature:37`<br>`tests/e2e/features/auth/login.feature:43`<br>`tests/e2e/features/dashboard/event-detail.feature:12`<br>`tests/e2e/features/dashboard/events-list.feature:12` |
| I navigate to "/dashboard/events/attendance" | _(missing)_ | `tests/e2e/features/dashboard/attendance-by-person.feature:12` |
| I navigate to "/dashboard/members" | _(missing)_ | `tests/e2e/features/members/members-list.feature:12` |
| I navigate to "/dashboard/members/issues" | _(missing)_ | `tests/e2e/features/members/member-issues.feature:12`<br>`tests/e2e/features/members/member-issues.feature:18` |
| I navigate to {string} | When – `tests/e2e/steps/shared.steps.ts:144` | _(unused)_ |
| I open the first event from the events list | When – `tests/e2e/steps/event-detail.steps.ts:6` | `tests/e2e/features/dashboard/event-detail.feature:13` |
| I select attendance grouping mode {string} | When – `tests/e2e/steps/attendance.steps.ts:12` | _(unused)_ |
| I should be on "/" | _(missing)_ | `tests/e2e/features/auth/login.feature:13`<br>`tests/e2e/features/auth/login.feature:33`<br>`tests/e2e/features/auth/login.feature:45`<br>`tests/e2e/features/auth/login.feature:56` |
| I should be on "/dashboard" | _(missing)_ | `tests/e2e/features/auth/login.feature:20`<br>`tests/e2e/features/auth/login.feature:26`<br>`tests/e2e/features/auth/login.feature:36` |
| I should be on "/dashboard/events" | _(missing)_ | `tests/e2e/features/auth/login.feature:28`<br>`tests/e2e/features/auth/login.feature:38`<br>`tests/e2e/features/auth/login.feature:49` |
| I should be on {string} | Then – `tests/e2e/steps/shared.steps.ts:250` | _(unused)_ |
| I should not see {string} | Then – `tests/e2e/steps/shared.steps.ts:260` | _(unused)_ |
| I should see "Attendance by Person" | _(missing)_ | `tests/e2e/features/dashboard/attendance-by-person.feature:13` |
| I should see "By Patrol & Event" | _(missing)_ | `tests/e2e/features/dashboard/attendance-by-person.feature:16` |
| I should see "By Patrol" | _(missing)_ | `tests/e2e/features/dashboard/attendance-by-person.feature:15` |
| I should see "Events" | _(missing)_ | `tests/e2e/features/dashboard/events-list.feature:13` |
| I should see "Members" | _(missing)_ | `tests/e2e/features/members/members-list.feature:13` |
| I should see "Sign in with OSM" | _(missing)_ | `tests/e2e/features/auth/login.feature:14`<br>`tests/e2e/features/auth/login.feature:57` |
| I should see "Single List" | _(missing)_ | `tests/e2e/features/dashboard/attendance-by-person.feature:14` |
| I should see {string} | Then – `tests/e2e/steps/shared.steps.ts:223` | _(unused)_ |
| I wait {int} ms | When – `tests/e2e/steps/shared.steps.ts:150` | _(unused)_ |
| I wait 6000 ms | _(missing)_ | `tests/e2e/features/auth/login.feature:55` |
| my session expires | When – `tests/e2e/steps/shared.steps.ts:200` | `tests/e2e/features/auth/login.feature:44` |
| the attendance grouping mode {string} should be selected | Then – `tests/e2e/steps/attendance.steps.ts:6` | _(unused)_ |
| the attendance-by-person view should render appropriately for this viewport | Then – `tests/e2e/steps/attendance.steps.ts:17` | `tests/e2e/features/dashboard/attendance-by-person.feature:17` |
| the callbackUrl should be "/dashboard/events" | _(missing)_ | `tests/e2e/features/auth/login.feature:46` |
| the callbackUrl should be {string} | Then – `tests/e2e/steps/shared.steps.ts:254` | _(unused)_ |
| the event detail page should load | Then – `tests/e2e/steps/event-detail.steps.ts:35` | `tests/e2e/features/dashboard/event-detail.feature:14` |
| the event participants should render appropriately for this viewport | Then – `tests/e2e/steps/event-detail.steps.ts:40` | `tests/e2e/features/dashboard/event-detail.feature:15` |
| the events list should render appropriately for this viewport | Then – `tests/e2e/steps/dashboard.steps.ts:6` | `tests/e2e/features/dashboard/events-list.feature:14` |
| the member issues page should load | Then – `tests/e2e/steps/member-issues.steps.ts:6` | `tests/e2e/features/members/member-issues.feature:13` |
| the member issues summary should render | Then – `tests/e2e/steps/member-issues.steps.ts:11` | `tests/e2e/features/members/member-issues.feature:19` |
| the member issues view should render appropriately for this viewport | Then – `tests/e2e/steps/member-issues.steps.ts:45` | `tests/e2e/features/members/member-issues.feature:14`<br>`tests/e2e/features/members/member-issues.feature:20` |
| the members list should render appropriately for this viewport | Then – `tests/e2e/steps/members.steps.ts:6` | `tests/e2e/features/members/members-list.feature:14` |

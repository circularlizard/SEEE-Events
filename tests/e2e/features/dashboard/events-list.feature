@REQ-VIEW-01 @REQ-VIEW-03 @REQ-VIEW-04
Feature: Shared Expedition Events View
  As a logged-in user
  I need to view upcoming SEEE expeditions
  So that I can review attendance and event details across Viewer and Planner apps

  @REQ-VIEW-01 @REQ-VIEW-03
  Scenario Outline: Events page loads and renders list content for <appLabel>
    Given I am logged in with mock persona "<persona>" for app "<appLabel>"
    When I navigate to "<eventsRoute>"
    Then I should see "Events"
    And the events list should render appropriately for this viewport

    Examples:
      | appLabel            | persona                        | eventsRoute                  |
      | Expedition Viewer   | seeeEventsOnlyRestrictedOther  | /dashboard/events            |
      | Expedition Planner  | seeeFullElevatedOther          | /dashboard/planning/events   |

  @REQ-VIEW-04 @desktop-only
  Scenario: Planner sidebar navigation to shared events view
    Given I am logged in with mock persona "seeeFullElevatedOther" for app "Expedition Planner"
    When I navigate to "/dashboard/planning/events"
    Then I should see "Events"
    And the events list should render appropriately for this viewport

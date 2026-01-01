@REQ-VIEW-02 @REQ-NFR-02
Feature: Event Detail Responsive Layout
  As a user
  I need the event detail participants list to render well on both desktop and mobile
  So that I can review attendees on any device

  Background:
    Given I am logged in with mock persona "seeeEventsOnlyRestrictedOther" for app "Expedition Viewer"

  @REQ-NFR-02
  Scenario: Event detail participants render appropriately for this viewport
    When I navigate to "/dashboard/events"
    And I open the first event from the events list
    Then the event detail page should load
    And the event participants should render appropriately for this viewport

@REQ-EVENTS-01 @REQ-EVENTS-02 @REQ-EVENTS-05
Feature: Events List
  As a logged-in user
  I need to view upcoming events
  So that I can review attendance and event details

  Background:
    Given I am logged in as an admin

  @REQ-EVENTS-02
  Scenario: Events page loads and renders list content
    When I navigate to "/dashboard/events"
    Then I should see "Events"
    And the events list should render appropriately for this viewport

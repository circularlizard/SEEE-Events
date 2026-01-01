@REQ-VIEW-14 @REQ-VIEW-17
Feature: Attendance Overview – Unit Summary Cards
  As an expedition leader
  I need to see unit-level attendance summaries
  So that I can quickly understand which patrols are attending which events

  Background:
    Given I am logged in as a standard viewer

  @REQ-VIEW-14
  Scenario: Attendance overview renders unit summary cards
    When I navigate to "/dashboard/events/attendance"
    Then the attendance overview should display unit summary cards
    And each unit card should show patrol name, attendee count, and event count

  @REQ-VIEW-17
  Scenario: Attendance overview is the expedition home redirect
    When I navigate to "/dashboard"
    Then I should be on "/dashboard/events/attendance"
    And the attendance overview should display unit summary cards

  @REQ-VIEW-14
  Scenario: Unit card navigation to drill-down
    When I navigate to "/dashboard/events/attendance"
    And I click on a unit summary card
    Then I should be on a unit detail page
    And I should see "Back to Attendance"

  @REQ-VIEW-15
  Scenario: Unit detail page displays event accordion and view toggle
    When I navigate to "/dashboard/events/attendance"
    And I click on a unit summary card
    Then I should be on a unit detail page
    And the unit detail page should display event accordion sections
    And I should see a view toggle for By Event and By Attendee

  @REQ-VIEW-05 @REQ-VIEW-16
  Scenario: Unit detail page shows cache and hydration indicators
    When I navigate to "/dashboard/events/attendance"
    And I click on a unit summary card
    Then I should be on a unit detail page
    And I should see a cache freshness indicator
    And I should see a hydration progress indicator

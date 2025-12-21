@REQ-EVENTS-05
Feature: Attendance by Person
  As a user
  I need to view attendance aggregated by person
  So that I can quickly see who is attending which events

  Background:
    Given I am logged in as an admin

  @REQ-EVENTS-05
  Scenario: Attendance by person page loads and shows grouping controls
    When I navigate to "/dashboard/events/attendance"
    Then I should see "Attendance by Person"
    And I should see "Single List"
    And I should see "By Patrol"
    And I should see "By Patrol & Event"

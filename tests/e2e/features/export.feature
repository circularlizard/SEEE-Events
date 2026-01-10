@REQ-VIEW-10 @REQ-VIEW-12
Feature: Export Event Participants
  As a leader viewing event details
  I want to export the participant list
  So that I can share or print the data offline

  Background:
    Given I am logged in as a standard user
    And I have navigated to an event detail page

  @REQ-VIEW-10
  Scenario: Export menu is visible on event detail page
    Then I should see an "Export Participants" button
    And the export button should be enabled when participants exist

  @REQ-VIEW-10
  Scenario: Export menu shows format options
    When I click the "Export Participants" button
    Then I should see a dropdown with export format options
    And I should see "Spreadsheet (.xlsx)" option
    And I should see "PDF Document (.pdf)" option

  @REQ-VIEW-10
  Scenario: Export menu shows row count
    When I click the "Export Participants" button
    Then I should see the number of rows to be exported
    And I should see filter information if filters are applied

  @REQ-VIEW-10
  Scenario: Export spreadsheet triggers download
    When I click the "Export Participants" button
    And I select "Spreadsheet (.xlsx)" option
    Then a file download should be triggered
    And the filename should contain "event-participants"
    And the filename should have ".xlsx" extension

  @REQ-VIEW-12
  Scenario: Export PDF triggers download
    When I click the "Export Participants" button
    And I select "PDF Document (.pdf)" option
    Then a file download should be triggered
    And the filename should contain "event-participants"
    And the filename should have ".pdf" extension

  @REQ-VIEW-10
  Scenario: Export respects current filters
    Given I have applied a unit filter
    When I click the "Export Participants" button
    Then I should see the filter count in the export menu
    And the exported data should only include filtered rows

  @REQ-VIEW-10
  Scenario: Export button is disabled when no data
    Given the event has no participants
    Then the "Export Participants" button should be disabled

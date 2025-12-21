@REQ-ADMIN-02 @REQ-ADMIN-03
Feature: Members List
  As an administrator
  I need to view a members list for the selected section
  So that I can review member information and data quality

  Background:
    Given I am logged in as an admin

  @REQ-ADMIN-02
  Scenario: Members page loads and renders member list content
    When I navigate to "/dashboard/members"
    Then I should see "Members"
    And the members list should render appropriately for this viewport

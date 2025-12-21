@REQ-ADMIN-04 @REQ-ADMIN-05 @REQ-ADMIN-06
Feature: Member Data Issues
  As an administrator
  I need to view data quality issues for members
  So that I can identify and address missing or inconsistent records

  Background:
    Given I am logged in as an admin

  @REQ-ADMIN-04
  Scenario: Member issues page loads
    When I navigate to "/dashboard/members/issues"
    Then the member issues page should load

  @REQ-ADMIN-05
  Scenario: Issue summary renders (either no issues or issue categories)
    When I navigate to "/dashboard/members/issues"
    Then the member issues summary should render

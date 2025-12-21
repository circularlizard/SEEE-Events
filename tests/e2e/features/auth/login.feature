@REQ-AUTH-01 @REQ-AUTH-02 @REQ-AUTH-03
Feature: Authentication and Login Flow
  As a user of the SEEE Dashboard
  I need to authenticate using OSM OAuth
  So that I can access the dashboard with appropriate permissions

  Background:
    Given I am on the login page

  @REQ-AUTH-02
  Scenario: Unauthenticated user is redirected to login
    When I navigate to "/dashboard"
    Then I should be on "/"
    And I should see "Sign in with OSM"

  @REQ-AUTH-03
  Scenario: User selects Administrator role and logs in
    When I click "Administrator"
    And I click the button "Sign in with OSM"
    Then I should be on "/dashboard"

  @REQ-AUTH-03
  Scenario: User selects Standard Viewer role and logs in
    When I click "Standard Viewer"
    And I click the button "Sign in with OSM"
    Then I should be on "/dashboard"
    When I navigate to "/dashboard/events"
    Then I should be on "/dashboard/events"

  @REQ-AUTH-12
  Scenario: User returns to intended page after login
    When I navigate to "/dashboard/events"
    Then I should be on "/"
    When I click "Administrator"
    And I click the button "Sign in with OSM"
    Then I should be on "/dashboard"
    When I navigate to "/dashboard/events"
    Then I should be on "/dashboard/events"

  @REQ-AUTH-11 @REQ-AUTH-12
  Scenario: Session expiry redirects to login and returns to intended page after re-login
    Given I am logged in as an admin
    When I navigate to "/dashboard/events"
    And my session expires
    Then I should be on "/"
    And the callbackUrl should be "/dashboard/events"
    When I click "Administrator"
    And I click the button "Sign in with OSM"
    Then I should be on "/dashboard/events"

  @REQ-AUTH-11
  Scenario: Inactivity triggers a hard logout
    Given I am logged in as an admin
    When I navigate to "/dashboard"
    And I wait 6000 ms
    Then I should be on "/"
    And I should see "Sign in with OSM"

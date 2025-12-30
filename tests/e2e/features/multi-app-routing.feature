@REQ-AUTH-01 @REQ-AUTH-02 @multi-app
Feature: Multi-App Routing and Access Control
  As a user with different roles
  I want to access applications based on my permissions
  So that I can use the appropriate dashboards safely

  Background:
    Given I am on the login page

  @REQ-AUTH-01
  Scenario: Admin selects Event Planning and can reach key consoles
    When I click "Administrator"
    And I click "Event Planning"
    And I click the button "Sign in with OSM"
    Then I should be on "/dashboard/planning"
    And I should see "Planning"
    When I navigate to "/dashboard/admin"
    Then I should see "Platform Admin Console"
    When I navigate to "/dashboard/events"
    Then I should see "Events"
    When I navigate to "/dashboard/members"
    Then I should see "Members"

  @REQ-AUTH-02
  Scenario: Standard viewer selects Expedition Viewer
    When I click "Standard Viewer"
    And I click "Expedition Viewer"
    And I click the button "Sign in with OSM"
    Then I should be on "/dashboard"
    And I should see "Events"
    When I navigate to "/dashboard/multi"
    Then I should see "Multi-Section Viewer"

  @REQ-AUTH-02
  Scenario: Standard viewer is blocked from platform admin routes
    Given I am logged in as a standard viewer
    When I navigate to "/dashboard/admin"
    Then I should see "Forbidden"
    When I navigate to "/dashboard/api-browser"
    Then I should see "Forbidden"
    When I navigate to "/dashboard/debug/oauth"
    Then I should see "Forbidden"

  @REQ-AUTH-01
  Scenario: Admin default app is Event Planning
    Given I am logged in as an admin
    Then I should see "Planning"

  @REQ-AUTH-02
  Scenario: Standard viewer default app is Expedition Viewer
    Given I am logged in as a standard viewer
    Then I should see "Events"

  @REQ-AUTH-01 @REQ-AUTH-02
  Scenario Outline: Role and app combinations navigate to expected routes
    When I click "<role label>"
    And I click "<app label>"
    And I click the button "Sign in with OSM"
    Then I should be on "<expected path>"
    And I should see "<expected heading>"

    Examples:
      | role label      | app label              | expected path        | expected heading         |
      | Administrator   | Event Planning         | /dashboard/planning  | Planning                 |
      | Administrator   | Platform Admin Console | /dashboard/admin     | Platform Admin Console   |
      | Administrator   | Expedition Viewer      | /dashboard           | Events                   |
      | Administrator   | Multi-Section Viewer   | /dashboard/multi     | Multi-Section Viewer     |
      | Standard Viewer | Expedition Viewer      | /dashboard           | Events                   |
      | Standard Viewer | Multi-Section Viewer   | /dashboard/multi     | Multi-Section Viewer     |

  @REQ-AUTH-02
  Scenario: Expedition app redirects away from planning routes
    Given I am logged in as a standard viewer
    When I navigate to "/dashboard/planning"
    Then I should be on "/dashboard"
    And I should not see "Planning"

  @REQ-AUTH-01
  Scenario: Multi app keeps section selector visible
    When I click "Administrator"
    And I click "Multi-Section Viewer"
    And I click the button "Sign in with OSM"
    Then I should be on "/dashboard/multi"
    When I navigate to "/dashboard/members"
    Then I should see "Select Your Section"

  @REQ-AUTH-01
  Scenario: Platform admin routes surface app-specific 404 pages
    Given I am logged in as an admin
    When I navigate to "/dashboard/planning/nonexistent"
    Then I should see "Page Not Found"
    And I should see "View Planning Dashboard"
    When I navigate to "/dashboard/events/nonexistent"
    Then I should see "Page Not Found"
    And I should see "View Events"

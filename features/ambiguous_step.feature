Feature: Ambiguous Steps

  Scenario:
    Given a feature with the step "a ambiguous step"
    And step definitions for
      | /^a ambiguous step$/ |
      | /^a (.*) step$/      |
    When I run cucumber.js
    Then the step "a ambiguous step" is ambiguous matching the step definitions:
      | /^a ambiguous step$/ |
      | /^a (.*) step$/      |

Feature: Running scenarios in parallel

  Background:
    Given a file named "features/step_definitions/cucumber_steps.js" with:
      """
      import {Given} from 'cucumber'
      import Promise from 'bluebird'

      Given(/^a slow step$/, function(callback) {
        setTimeout(callback, 4000)
      })
      """

  Scenario: running in parallel can improve speed
    Given a file named "features/a.feature" with:
      """
      Feature: slow
        Scenario: a
          Given a slow step

        Scenario: b
          Given a slow step

        Scenario: c
          Given a slow step

        Scenario: d
          Given a slow step
      """
    When I run cucumber-js with `--parallel 4`
    Then it passes
    And it runs in less than 8 seconds

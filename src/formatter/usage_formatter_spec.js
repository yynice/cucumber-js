import { beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import UsageFormatter from './usage_formatter'
import EventEmitter from 'events'
import Gherkin from 'gherkin'
import { EventDataCollector } from './helpers'

describe('UsageFormatter', () => {
  describe('handleFeaturesResult', () => {
    beforeEach(function() {
      this.eventBroadcaster = new EventEmitter()
      this.output = ''
      const logFn = data => {
        this.output += data
      }
      this.supportCodeLibrary = {
        stepDefinitions: [],
      }
      this.usageFormatter = new UsageFormatter({
        cwd: '/path/to/project',
        eventBroadcaster: this.eventBroadcaster,
        eventDataCollector: new EventDataCollector(this.eventBroadcaster),
        log: logFn,
        supportCodeLibrary: this.supportCodeLibrary,
      })
    })

    describe('no step definitions', () => {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-run-finished')
      })

      it('outputs "No step definitions"', function() {
        expect(this.output).to.eql('No step definitions')
      })
    })

    describe('with one step definition', () => {
      beforeEach(function() {
        this.stepDefinition = {
          line: 1,
          pattern: {
            source: '^abc?$',
            type: 'regular_expression',
          },
          uri: '/path/to/project/steps.js',
        }
        this.supportCodeLibrary.stepDefinitions = [this.stepDefinition]
      })

      describe('unused', () => {
        beforeEach(function() {
          this.eventBroadcaster.emit('test-run-finished')
        })

        it('outputs the step definition as unused', function() {
          expect(this.output).to.eql(
            '┌────────────────┬──────────┬────────────┐\n' +
              '│ Pattern / Text │ Duration │ Location   │\n' +
              '├────────────────┼──────────┼────────────┤\n' +
              '│ ^abc?$         │ UNUSED   │ steps.js:1 │\n' +
              '└────────────────┴──────────┴────────────┘\n'
          )
        })
      })

      describe('used', () => {
        beforeEach(function() {
          const events = Gherkin.generateEvents(
            'Feature: a\nScenario: b\nWhen abc\nThen ab',
            '/path/to/project/a.feature'
          )
          events.forEach(event => {
            this.eventBroadcaster.emit(event.type, event)
            if (event.type === 'pickle') {
              this.eventBroadcaster.emit('pickle-accepted', {
                type: 'pickle-accepted',
                pickle: event.pickle,
                uri: event.uri,
              })
            }
          })
          this.testCase = {
            sourceLocation: { uri: '/path/to/project/a.feature', line: 2 },
          }
          this.eventBroadcaster.emit('test-case-prepared', {
            ...this.testCase,
            steps: [
              {
                sourceLocation: { uri: '/path/to/project/a.feature', line: 3 },
                actionLocation: { uri: '/path/to/project/steps.js', line: 1 },
              },
              {
                sourceLocation: { uri: '/path/to/project/a.feature', line: 4 },
                actionLocation: { uri: '/path/to/project/steps.js', line: 1 },
              },
            ],
          })
        })

        describe('in dry run', () => {
          beforeEach(function() {
            this.eventBroadcaster.emit('test-step-finished', {
              index: 0,
              testCase: this.testCase,
              result: {},
            })
            this.eventBroadcaster.emit('test-step-finished', {
              index: 1,
              testCase: this.testCase,
              result: {},
            })
            this.eventBroadcaster.emit('test-run-finished')
          })

          it('outputs the step definition without durations', function() {
            expect(this.output).to.eql(
              '┌────────────────┬──────────┬─────────────┐\n' +
                '│ Pattern / Text │ Duration │ Location    │\n' +
                '├────────────────┼──────────┼─────────────┤\n' +
                '│ ^abc?$         │ -        │ steps.js:1  │\n' +
                '│   ab           │ -        │ a.feature:4 │\n' +
                '│   abc          │ -        │ a.feature:3 │\n' +
                '└────────────────┴──────────┴─────────────┘\n'
            )
          })
        })

        describe('not in dry run', () => {
          beforeEach(function() {
            this.eventBroadcaster.emit('test-step-finished', {
              index: 0,
              testCase: this.testCase,
              result: { duration: 1 },
            })
            this.eventBroadcaster.emit('test-step-finished', {
              index: 1,
              testCase: this.testCase,
              result: { duration: 0 },
            })
            this.eventBroadcaster.emit('test-run-finished')
          })

          it('outputs the step definition with durations in desending order', function() {
            expect(this.output).to.eql(
              '┌────────────────┬──────────┬─────────────┐\n' +
                '│ Pattern / Text │ Duration │ Location    │\n' +
                '├────────────────┼──────────┼─────────────┤\n' +
                '│ ^abc?$         │ 0.5ms    │ steps.js:1  │\n' +
                '│   abc          │ 1ms      │ a.feature:3 │\n' +
                '│   ab           │ 0ms      │ a.feature:4 │\n' +
                '└────────────────┴──────────┴─────────────┘\n'
            )
          })
        })
      })
    })

    describe('with multiple definition', () => {
      beforeEach(function() {
        this.supportCodeLibrary.stepDefinitions = [
          {
            line: 1,
            pattern: {
              source: 'abc',
              type: 'regular_expression',
            },
            uri: '/path/to/project/steps.js',
          },
          {
            line: 2,
            pattern: {
              source: 'def',
              type: 'regular_expression',
            },
            uri: '/path/to/project/steps.js',
          },
          {
            line: 3,
            pattern: {
              source: 'ghi',
              type: 'regular_expression',
            },
            uri: '/path/to/project/steps.js',
          },
        ]
        const events = Gherkin.generateEvents(
          'Feature: a\nScenario: b\nGiven abc\nWhen def',
          '/path/to/project/a.feature'
        )
        events.forEach(event => {
          this.eventBroadcaster.emit(event.type, event)
          if (event.type === 'pickle') {
            this.eventBroadcaster.emit('pickle-accepted', {
              type: 'pickle-accepted',
              pickle: event.pickle,
              uri: event.uri,
            })
          }
        })
        const testCase = {
          sourceLocation: { uri: '/path/to/project/a.feature', line: 2 },
        }
        this.eventBroadcaster.emit('test-case-prepared', {
          ...testCase,
          steps: [
            {
              sourceLocation: { uri: '/path/to/project/a.feature', line: 3 },
              actionLocation: { uri: '/path/to/project/steps.js', line: 1 },
            },
            {
              sourceLocation: { uri: '/path/to/project/a.feature', line: 4 },
              actionLocation: { uri: '/path/to/project/steps.js', line: 2 },
            },
          ],
        })
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          testCase,
          result: { duration: 1 },
        })
        this.eventBroadcaster.emit('test-step-finished', {
          index: 1,
          testCase,
          result: { duration: 2 },
        })
        this.eventBroadcaster.emit('test-run-finished')
      })

      it('outputs the step definitions ordered by mean duration descending with unused steps at the end', function() {
        expect(this.output).to.eql(
          '┌────────────────┬──────────┬─────────────┐\n' +
            '│ Pattern / Text │ Duration │ Location    │\n' +
            '├────────────────┼──────────┼─────────────┤\n' +
            '│ def            │ 2ms      │ steps.js:2  │\n' +
            '│   def          │ 2ms      │ a.feature:4 │\n' +
            '├────────────────┼──────────┼─────────────┤\n' +
            '│ abc            │ 1ms      │ steps.js:1  │\n' +
            '│   abc          │ 1ms      │ a.feature:3 │\n' +
            '├────────────────┼──────────┼─────────────┤\n' +
            '│ ghi            │ UNUSED   │ steps.js:3  │\n' +
            '└────────────────┴──────────┴─────────────┘\n'
        )
      })
    })
  })
})

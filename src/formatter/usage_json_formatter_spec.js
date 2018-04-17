import { beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import UsageJsonFormatter from './usage_json_formatter'
import EventEmitter from 'events'
import Gherkin from 'gherkin'
import { EventDataCollector } from './helpers'

describe('UsageJsonFormatter', () => {
  describe('handleFeaturesResult', () => {
    beforeEach(function() {
      const eventBroadcaster = new EventEmitter()
      this.output = ''
      const logFn = data => {
        this.output += data
      }
      const supportCodeLibrary = {
        stepDefinitions: [
          {
            line: 1,
            pattern: '/abc/',
            uri: '/path/to/project/steps.js',
          },
          {
            line: 2,
            pattern: '/def/',
            uri: '/path/to/project/steps.js',
          },
          {
            line: 3,
            pattern: '/ghi/',
            uri: '/path/to/project/steps.js',
          },
        ],
      }
      this.usageJsonFormatter = new UsageJsonFormatter({
        cwd: '/path/to/project/',
        eventBroadcaster,
        eventDataCollector: new EventDataCollector(eventBroadcaster),
        log: logFn,
        supportCodeLibrary,
      })
      const events = Gherkin.generateEvents(
        'Feature: a\nScenario: b\nGiven abc\nWhen def',
        '/path/to/project/a.feature'
      )
      events.forEach(event => {
        eventBroadcaster.emit(event.type, event)
        if (event.type === 'pickle') {
          eventBroadcaster.emit('pickle-accepted', {
            type: 'pickle-accepted',
            pickle: event.pickle,
            uri: event.uri,
          })
        }
      })
      const testCase = {
        sourceLocation: { uri: '/path/to/project/a.feature', line: 2 },
      }
      eventBroadcaster.emit('test-case-prepared', {
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
      eventBroadcaster.emit('test-step-finished', {
        index: 0,
        testCase,
        result: { duration: 1 },
      })
      eventBroadcaster.emit('test-step-finished', {
        index: 1,
        testCase,
        result: { duration: 2 },
      })
      eventBroadcaster.emit('test-run-finished')
    })

    it('outputs the usage in json format', function() {
      const parsedOutput = JSON.parse(this.output)
      expect(parsedOutput).to.eql([
        {
          line: 2,
          matches: [
            {
              duration: 2,
              line: 4,
              text: 'def',
              uri: 'a.feature',
            },
          ],
          meanDuration: 2,
          pattern: '/def/',
          uri: 'steps.js',
        },
        {
          line: 1,
          matches: [
            {
              duration: 1,
              line: 3,
              text: 'abc',
              uri: 'a.feature',
            },
          ],
          meanDuration: 1,
          pattern: '/abc/',
          uri: 'steps.js',
        },
        {
          line: 3,
          matches: [],
          pattern: '/ghi/',
          uri: 'steps.js',
        },
      ])
    })
  })
})

import { beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import _ from 'lodash'
import path from 'path'
import RerunFormatter from './rerun_formatter'
import Status from '../status'
import { EventEmitter } from 'events'

function prepareFormatter(options = {}) {
  this.output = ''
  const logFn = data => {
    this.output += data
  }
  this.eventBroadcaster = new EventEmitter()
  const cwd = path.normalize('/path/to/project')
  this.feature1RelativePath = path.join('features', 'a.feature')
  this.feature1AbsolutePath = path.join(cwd, this.feature1RelativePath)
  this.feature2RelativePath = path.join('features', 'b.feature')
  this.feature2AbsolutePath = path.join(cwd, this.feature2RelativePath)
  this.rerunFormatter = new RerunFormatter({
    ...options,
    cwd,
    eventBroadcaster: this.eventBroadcaster,
    log: logFn,
  })
}

describe('RerunFormatter', () => {
  beforeEach(prepareFormatter)

  describe('with no scenarios', () => {
    beforeEach(function() {
      this.eventBroadcaster.emit('test-run-finished')
    })

    it('outputs nothing', function() {
      expect(this.output).to.eql('')
    })
  })

  _.each([Status.PASSED], status => {
    describe(`with one ${status} scenario`, () => {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-case-finished', {
          sourceLocation: { uri: this.feature1AbsolutePath, line: 1 },
          result: { status },
        })
        this.eventBroadcaster.emit('test-run-finished')
      })

      it('outputs nothing', function() {
        expect(this.output).to.eql('')
      })
    })
  })

  _.each(
    [
      Status.AMBIGUOUS,
      Status.FAILED,
      Status.PENDING,
      Status.SKIPPED,
      Status.UNDEFINED,
    ],
    status => {
      describe(`with one ${status} scenario`, () => {
        beforeEach(function() {
          this.eventBroadcaster.emit('test-case-finished', {
            sourceLocation: { uri: this.feature1AbsolutePath, line: 1 },
            result: { status },
          })
          this.eventBroadcaster.emit('test-run-finished')
        })

        it('outputs the reference needed to run the scenario again', function() {
          expect(this.output).to.eql(`${this.feature1RelativePath}:1`)
        })
      })
    }
  )

  describe('with two failing scenarios in the same file', () => {
    beforeEach(function() {
      this.eventBroadcaster.emit('test-case-finished', {
        sourceLocation: { uri: this.feature1AbsolutePath, line: 1 },
        result: { status: Status.FAILED },
      })
      this.eventBroadcaster.emit('test-case-finished', {
        sourceLocation: { uri: this.feature1AbsolutePath, line: 2 },
        result: { status: Status.FAILED },
      })
      this.eventBroadcaster.emit('test-run-finished')
    })

    it('outputs the reference needed to run the scenarios again', function() {
      expect(this.output).to.eql(`${this.feature1RelativePath}:1:2`)
    })
  })

  _.each(
    [
      { separator: { opt: undefined, expected: '\n' }, label: 'default' },
      { separator: { opt: '\n', expected: '\n' }, label: 'newline' },
      { separator: { opt: ' ', expected: ' ' }, label: 'space' },
    ],
    ({ separator, label }) => {
      describe(`using ${label} separator`, () => {
        describe('with two failing scenarios in different files', () => {
          beforeEach(function() {
            prepareFormatter.apply(this, [
              { rerun: { separator: separator.opt } },
            ])

            this.eventBroadcaster.emit('test-case-finished', {
              sourceLocation: { uri: this.feature1AbsolutePath, line: 1 },
              result: { status: Status.FAILED },
            })
            this.eventBroadcaster.emit('test-case-finished', {
              sourceLocation: { uri: this.feature2AbsolutePath, line: 2 },
              result: { status: Status.FAILED },
            })
            this.eventBroadcaster.emit('test-run-finished')
          })

          it('outputs the references needed to run the scenarios again', function() {
            expect(this.output).to.eql(
              `${this.feature1RelativePath}:1${separator.expected}${this
                .feature2RelativePath}:2`
            )
          })
        })
      })
    }
  )
})

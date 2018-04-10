import _ from 'lodash'
import { formatLocation } from '../../formatter/helpers'
import Promise from 'bluebird'
import StackTraceFilter from '../stack_trace_filter'
import UserCodeRunner from '../../user_code_runner'
import VError from 'verror'
import childProcess from 'child_process'
import readline from 'readline'
import commandTypes from './command_types'
import AttachmentManager from '../attachment_manager'
import { buildStepArgumentIterator } from '../../step_arguments'
import DataTable from '../../models/data_table'
import StepRunner from '../step_runner'

export default class Runtime {
  // featuresConfig - {absolutePaths, defaultLanguage, orderSeed, filters}
  //   filters - {names, lines, tagExpression}
  //     lines - { [featurePath]: [line1, line2, ...], ... }
  // runtimeConfig - {isDryRun, isFailFast, isStrict}
  constructor({
    eventBroadcaster,
    featuresConfig,
    runtimeConfig,
    supportCodeLibrary,
    filterStacktraces,
    worldParameters,
  }) {
    this.eventBroadcaster = eventBroadcaster
    this.featuresConfig = featuresConfig
    this.runtimeConfig = runtimeConfig
    this.filterStacktraces = filterStacktraces
    this.stackTraceFilter = new StackTraceFilter()
    this.supportCodeLibrary = supportCodeLibrary
    this.testCases = {}
  }

  getStepParameters({
    patternMatches,
    pickleArguments,
    parameterTypeNameToTransform,
    world,
  }) {
    const stepPatternParameters = patternMatches.map(
      ({ captures, parameterTypeName }) => {
        const transform =
          parameterTypeNameToTransform[parameterTypeName] ||
          function(c) {
            return c[0]
          }
        return transform.apply(world, captures)
      }
    )
    const iterator = buildStepArgumentIterator({
      dataTable: arg => new DataTable(arg),
      docString: arg => arg.content,
    })
    const stepArgumentParameters = pickleArguments.map(iterator)
    return stepPatternParameters.concat(stepArgumentParameters)
  }

  async runTestRunHooks(key, name) {
    await Promise.each(this.supportCodeLibrary[key], async hookDefinition => {
      const { error } = await UserCodeRunner.run({
        argsArray: [],
        fn: hookDefinition.code,
        thisArg: null,
        timeoutInMilliseconds:
          hookDefinition.options.timeout ||
          this.supportCodeLibrary.defaultTimeout,
      })
      if (error) {
        const location = formatLocation(hookDefinition)
        throw new VError(
          error,
          `${name} hook errored, process exiting: ${location}`
        )
      }
    })
  }

  runBeforeTestCaseHook({ testCaseId, testCaseHookDefinitionId }) {
    return StepRunner.run({
      defaultTimeout: this.supportCodeLibrary.defaultTimeout,
      parameters: [], // todo get hook parameter
      stepDefinition: _.find(
        this.supportCodeLibrary.beforeTestCaseHookDefinitions,
        ['id', testCaseHookDefinitionId]
      ),
      world: this.testCases[testCaseId].world,
    })
  }

  runAfterTestCaseHook({ id, testCaseId, testCaseHookDefinitionId }) {
    return StepRunner.run({
      defaultTimeout: this.supportCodeLibrary.defaultTimeout,
      parameters: [], // todo get hook parameter
      stepDefinition: _.find(
        this.supportCodeLibrary.afterTestCaseHookDefinitions,
        ['id', testCaseHookDefinitionId]
      ),
      world: this.testCases[testCaseId].world,
    })
  }

  runStep({
    id,
    testCaseId,
    stepDefinitionId,
    pickleArguments,
    patternMatches,
  }) {
    const parameters = this.getStepParameters({
      pickleArguments,
      patternMatches,
      parameterTypeNameToTransform: this.supportCodeLibrary
        .parameterTypeNameToTransform,
      world: this.testCases[testCaseId].world,
    })
    return StepRunner.run({
      defaultTimeout: this.supportCodeLibrary.defaultTimeout,
      parameters,
      stepDefinition: _.find(this.supportCodeLibrary.stepDefinitions, [
        'id',
        stepDefinitionId,
      ]),
      world: this.testCases[testCaseId].world,
    })
  }

  async parseCommand(line) {
    const command = JSON.parse(line)
    switch (command.type) {
      case commandTypes.RUN_BEFORE_TEST_RUN_HOOKS:
        await this.runTestRunHooks(
          'beforeTestRunHookDefinitions',
          'a BeforeAll'
        )
        this.sendActionComplete({ responseTo: command.id })
        break
      case commandTypes.RUN_AFTER_TEST_RUN_HOOKS:
        await this.runTestRunHooks('afterTestRunHookDefinitions', 'an AfterAll')
        this.sendActionComplete({ responseTo: command.id })
        break
      case commandTypes.INITIALIZE_TEST_CASE:
        const attachmentManager = new AttachmentManager(({ data, media }) => {
          this.testCases[command.testCaseId] = { data, media }
        })
        this.testCases[command.testCaseId] = {
          attachmentManager,
          world: new this.supportCodeLibrary.World({
            attach: ::attachmentManager.create,
            parameters: this.worldParameters,
          }),
        }
        this.sendActionComplete({ responseTo: command.id })
        break
      case commandTypes.RUN_BEFORE_TEST_CASE_HOOK:
        const beforeHookResult = await this.runBeforeTestCaseHook(command)
        this.sendActionComplete({
          responseTo: command.id,
          hookOrStepResult: beforeHookResult,
        })
        break
      case commandTypes.RUN_AFTER_TEST_CASE_HOOK:
        const afterHookResult = await this.runAfterTestCaseHook(command)
        this.sendActionComplete({
          responseTo: command.id,
          hookOrStepResult: afterHookResult,
        })
        break
      case commandTypes.RUN_TEST_STEP:
        const stepResult = await this.runStep(command)
        this.sendActionComplete({
          responseTo: command.id,
          hookOrStepResult: stepResult,
        })
        break
      case commandTypes.GENERATE_SNIPPET:
        this.sendActionComplete({
          responseTo: command.id,
          snippet: '', // TODO create snippet
        })
        break
      case commandTypes.EVENT:
        this.eventBroadcaster.emit(command.event.type, command.event)
        if (command.event.type === 'test-run-finished') {
          this.result = command.event.result
          this.pickleRunner.stdin.end()
        }
        break
      case commandTypes.ERROR:
        throw new Error(command.message)
      default:
        throw new Error(`Unexpected message from pickle runner: ${line}`)
    }
  }

  sendActionComplete(data = {}) {
    this.pickleRunner.stdin.write(
      JSON.stringify({
        command: commandTypes.ACTION_COMPLETE,
        ...data,
      }) + '\n'
    )
  }

  run(done) {
    if (this.filterStacktraces) {
      this.stackTraceFilter.filter()
    }
    this.pickleRunner = childProcess.spawn('cucumber-pickle-runner', [], {
      stdio: ['pipe', 'pipe', process.stderr],
    })
    this.pickleRunner.on('exit', () => {
      if (!this.result) {
        throw new Error('Pickle runner exited unexpectedly')
      }
      if (this.filterStacktraces) {
        this.stackTraceFilter.unfilter()
      }
      done(this.result.success)
    })
    const rl = readline.createInterface({ input: this.pickleRunner.stdout })
    rl.on('line', line => {
      this.parseCommand(line)
    })
    rl.on('close', () => {
      if (!this.result) {
        throw new Error('Pickle runner closed stdout unexpectedly')
      }
    })
    this.pickleRunner.stdin.write(
      JSON.stringify({
        featuresConfig: this.featuresConfig,
        runtimeConfig: this.runtimeConfig,
        supportCodeConfig: _.pick(this.supportCodeLibrary, [
          'afterTestCaseHookDefinitions',
          'beforeTestCaseHookDefinitions',
          'parameterTypes',
          'stepDefinitions',
        ]),
        type: 'start',
      }) + '\n'
    )
  }
}

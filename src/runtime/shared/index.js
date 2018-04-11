import { formatLocation } from '../formatter/helpers'
import Promise from 'bluebird'
import StackTraceFilter from './stack_trace_filter'
import UserCodeRunner from '../user_code_runner'
import VError from 'verror'
import childProcess from 'child_process'
import readline from 'readline'
import commandTypes from './command_types'
import AttachmentManager from './attachment_manager'
import { buildStepArgumentIterator } from '../step_arguments'
import DataTable from '../models/data/table'
import StepRunner from './step_runner'

export default class Runtime {
  // featuresConfig - {absolutePaths, defaultLanguage, orderSeed, filters}
  //   filters - {names, lines, tagExpression}
  //     lines - { [featurePath]: [line1, line2, ...], ... }
  // runtimeConfig - {isDryRun, isFailFast, isStrict}
  constructor({
    cwd,
    eventBroadcaster,
    featuresConfig,
    runtimeConfig,
    supportCodeLibrary,
    filterStacktraces,
    worldParameters,
  }) {
    this.cwd = cwd
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
        return transform.call(world, captures)
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
        const location = formatLocation(hookDefinition, this.cwd)
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
      stepDefinition: null, // todo get proper hook definition
      world: this.testCases[testCaseId].world,
    })
  }

  runAfterTestCaseHook({ id, testCaseId, testCaseHookDefinitionId }) {
    return StepRunner.run({
      defaultTimeout: this.supportCodeLibrary.defaultTimeout,
      parameters: [], // todo get hook parameter
      stepDefinition: null, // todo get proper hook definition
      world: this.testCases[testCaseId].world,
    })
  }

  async runStep(testCaseId, stepId, parameters) {
    const result = await StepRunner.run({
      defaultTimeout: this.supportCodeLibrary.defaultTimeout,
      parameters,
      stepDefinition: null, // todo get proper step definition
      world: this.testCases[testCaseId].world,
    })
    this.sendActionComplete({ hookOrStepResult: result })
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
        const parameters = this.getStepParameters({
          pickleArguments: command.arguments,
          patternMatches: command.patternMatches,
          parameterTypeNameToTransform: this.supportCodeLibrary
            .parameterTypeNameToTransform,
          world: this.testCases[command.testCaseId].world,
        })
        const stepResult = await this.runStep(
          command.testCaseId,
          command.stepDefinitionId,
          parameters
        )
        this.sendActionComplete({
          responseTo: command.id,
          hookOrStepResult: stepResult,
        })
        break
      case commandTypes.EVENT:
        this.eventBroadcaster.emit(command.event.type, command.event.data)
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

  start(done) {
    if (this.options.filterStacktraces) {
      this.stackTraceFilter.filter()
    }
    this.pickleRunner = childProcess.spawn('cucumber-pickle-runner', [], {
      env: {},
      stdio: ['pipe', 'pipe', process.stderr],
    })
    this.childProcess.on('exit', () => {
      if (!this.result) {
        throw new Error('Pickle runner exited unexpectedly')
      }
      if (this.options.filterStacktraces) {
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
        type: 'start',
      }) + '\n'
    )
  }
}

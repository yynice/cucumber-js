import _ from 'lodash'
import util from 'util'
import {
  buildStepDefinition,
  buildTestCaseHookDefinition,
  buildTestRunHookDefinition,
} from './build_helpers'
import { wrapDefinitions } from './finalize_helpers'

export class SupportCodeLibraryBuilder {
  constructor() {
    this.nextId = 1
    this.methods = {
      defineParameterType: this.defineParameterType.bind(this),
      After: this.defineTestCaseHook('afterTestCaseHookDefinitions'),
      AfterAll: this.defineTestRunHook('afterTestRunHookDefinitions'),
      Before: this.defineTestCaseHook('beforeTestCaseHookDefinitions'),
      BeforeAll: this.defineTestRunHook('beforeTestRunHookDefinitions'),
      defineStep: this.defineStep.bind(this),
      defineSupportCode: util.deprecate(fn => {
        fn(this.methods)
      }, 'cucumber: defineSupportCode is deprecated. Please require/import the individual methods instead.'),
      setDefaultTimeout: milliseconds => {
        this.options.defaultTimeout = milliseconds
      },
      setDefinitionFunctionWrapper: fn => {
        this.options.definitionFunctionWrapper = fn
      },
      setWorldConstructor: fn => {
        this.options.World = fn
      },
    }
    this.methods.Given = this.methods.When = this.methods.Then = this.methods.defineStep
  }

  defineParameterType({
    name,
    typeName,
    regexp,
    transformer,
    useForSnippets,
    preferForRegexpMatch,
  }) {
    const getTypeName = util.deprecate(
      () => typeName,
      'Cucumber defineParameterType: Use name instead of typeName'
    )
    const _name = name || getTypeName()
    if (typeof useForSnippets !== 'boolean') useForSnippets = true
    if (typeof preferForRegexpMatch !== 'boolean') preferForRegexpMatch = false
    const regexps = (_.isArray(regexp) ? regexp : [regexp]).map(
      r => (typeof r === 'string' ? r : r.source)
    )
    this.options.parameterTypes.push({
      name: _name,
      regexps,
      useForSnippets,
      preferForRegexpMatch,
    })
    this.options.parameterTypeNameToTransform[_name] = transformer
  }

  defineStep(pattern, options, code) {
    const stepDefinition = buildStepDefinition({
      id: this.getNextId().toString(),
      pattern,
      options,
      code,
      cwd: this.cwd,
    })
    this.options.stepDefinitions.push(stepDefinition)
  }

  defineTestCaseHook(collectionName) {
    return (options, code) => {
      const hookDefinition = buildTestCaseHookDefinition({
        id: this.getNextId().toString(),
        options,
        code,
        cwd: this.cwd,
      })
      this.options[collectionName].push(hookDefinition)
    }
  }

  defineTestRunHook(collectionName) {
    return (options, code) => {
      const hookDefinition = buildTestRunHookDefinition({
        id: this.getNextId().toString(),
        options,
        code,
        cwd: this.cwd,
      })
      this.options[collectionName].push(hookDefinition)
    }
  }

  getNextId() {
    const output = this.nextId
    this.nextId += 1
    return output
  }

  finalize() {
    wrapDefinitions({
      cwd: this.cwd,
      definitionFunctionWrapper: this.options.definitionFunctionWrapper,
      definitions: _.chain([
        'afterTestCaseHook',
        'afterTestRunHook',
        'beforeTestCaseHook',
        'beforeTestRunHook',
        'step',
      ])
        .map(key => this.options[`${key}Definitions`])
        .flatten()
        .value(),
    })
    this.options.afterTestCaseHookDefinitions.reverse()
    this.options.afterTestRunHookDefinitions.reverse()
    return this.options
  }

  reset(cwd) {
    this.cwd = cwd
    this.options = _.cloneDeep({
      afterTestCaseHookDefinitions: [],
      afterTestRunHookDefinitions: [],
      beforeTestCaseHookDefinitions: [],
      beforeTestRunHookDefinitions: [],
      defaultTimeout: 5000,
      definitionFunctionWrapper: null,
      stepDefinitions: [],
      parameterTypes: [],
      parameterTypeNameToTransform: {
        int: parseInt,
        float: parseFloat,
      },
      World({ attach, parameters }) {
        this.attach = attach
        this.parameters = parameters
      },
    })
  }
}

export default new SupportCodeLibraryBuilder()

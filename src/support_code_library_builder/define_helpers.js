import { deprecate } from 'util'
import _ from 'lodash'
import { formatLocation } from '../formatter/helpers'
import path from 'path'
import StackTrace from 'stacktrace-js'
import StepDefinition from '../models/step_definition'
import TestCaseHookDefinition from '../models/test_case_hook_definition'
import TestRunHookDefinition from '../models/test_run_hook_definition'
import validateArguments from './validate_arguments'

export function defineTestCaseHook(builder, collectionName) {
  return (options, code) => {
    if (typeof options === 'string') {
      options = { tags: options }
    } else if (typeof options === 'function') {
      code = options
      options = {}
    }
    const { line, uri } = getDefinitionLineAndUri(builder.cwd)
    validateArguments({
      args: { code, options },
      fnName: 'defineTestCaseHook',
      location: formatLocation({ line, uri }),
    })
    const hookDefinition = new TestCaseHookDefinition({
      id: builder.getNextId(),
      code,
      line,
      options,
      uri,
    })
    builder.options[collectionName].push(hookDefinition)
  }
}

export function defineTestRunHook(builder, collectionName) {
  return (options, code) => {
    if (typeof options === 'string') {
      options = { tags: options }
    } else if (typeof options === 'function') {
      code = options
      options = {}
    }
    const { line, uri } = getDefinitionLineAndUri(builder.cwd)
    validateArguments({
      args: { code, options },
      fnName: 'defineTestRunHook',
      location: formatLocation({ line, uri }),
    })
    const hookDefinition = new TestRunHookDefinition({
      id: builder.getNextId(),
      code,
      line,
      options,
      uri,
    })
    builder.options[collectionName].push(hookDefinition)
  }
}

export function defineStep(builder) {
  return (pattern, options, code) => {
    if (typeof options === 'function') {
      code = options
      options = {}
    }
    const { line, uri } = getDefinitionLineAndUri(builder.cwd)
    validateArguments({
      args: { code, pattern, options },
      fnName: 'defineStep',
      location: formatLocation({ line, uri }),
    })
    const stepDefinition = new StepDefinition({
      id: builder.getNextId(),
      code,
      line,
      options,
      pattern: {
        source: pattern,
        type:
          typeof patternSource === 'string'
            ? 'cucumber_expression'
            : 'regular_expression',
      },
      uri,
    })
    builder.options.stepDefinitions.push(stepDefinition)
  }
}

const projectPath = path.join(__dirname, '..', '..')
const projectSrcPath = path.join(projectPath, 'src')
const projectLibPath = path.join(projectPath, 'lib')

function getDefinitionLineAndUri(cwd) {
  let line = 'unknown'
  let uri = 'unknown'
  const stackframes = StackTrace.getSync()
  const stackframe = _.find(stackframes, frame => {
    const filename = frame.getFileName()
    return (
      !_.includes(filename, projectSrcPath) &&
      !_.includes(filename, projectLibPath)
    )
  })
  if (stackframe) {
    line = stackframe.getLineNumber()
    uri = stackframe.getFileName()
    if (uri) {
      uri = path.relative(cwd, uri)
    }
  }
  return { line, uri }
}

export function defineParameterType(builder) {
  return ({
    name,
    typeName,
    regexp,
    transformer,
    useForSnippets,
    preferForRegexpMatch,
  }) => {
    const getTypeName = deprecate(
      () => typeName,
      'Cucumber defineParameterType: Use name instead of typeName'
    )
    const _name = name || getTypeName()
    if (typeof useForSnippets !== 'boolean') useForSnippets = true
    if (typeof preferForRegexpMatch !== 'boolean') preferForRegexpMatch = false
    builder.options.parameterTypes.push({
      name: _name,
      regexps: Array(regexp),
      useForSnippets,
      preferForRegexpMatch,
    })
    builder.options.parameterTypeNameToTransform[name] = transformer
  }
}

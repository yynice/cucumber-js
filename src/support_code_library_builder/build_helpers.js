import _ from 'lodash'
import { formatLocation } from '../formatter/helpers'
import path from 'path'
import StackTrace from 'stacktrace-js'
import StepDefinition from '../models/step_definition'
import TestCaseHookDefinition from '../models/test_case_hook_definition'
import TestRunHookDefinition from '../models/test_run_hook_definition'
import validateArguments from './validate_arguments'

export function buildTestCaseHookDefinition({ id, options, code, cwd }) {
  if (typeof options === 'string') {
    options = { tags: options }
  } else if (typeof options === 'function') {
    code = options
    options = {}
  }
  const { line, uri } = getDefinitionLineAndUri()
  validateArguments({
    args: { code, options },
    fnName: 'defineTestCaseHook',
    location: formatLocation({ line, uri }, cwd),
  })
  return new TestCaseHookDefinition({
    code,
    id,
    line,
    options,
    uri,
  })
}

export function buildTestRunHookDefinition({ id, options, code, cwd }) {
  if (typeof options === 'string') {
    options = { tags: options }
  } else if (typeof options === 'function') {
    code = options
    options = {}
  }
  const { line, uri } = getDefinitionLineAndUri()
  validateArguments({
    args: { code, options },
    fnName: 'defineTestRunHook',
    location: formatLocation({ line, uri }, cwd),
  })
  return new TestRunHookDefinition({
    code,
    id,
    line,
    options,
    uri,
  })
}

export function buildStepDefinition({ id, pattern, options, code, cwd }) {
  if (typeof options === 'function') {
    code = options
    options = {}
  }
  const { line, uri } = getDefinitionLineAndUri()
  validateArguments({
    args: { code, pattern, options },
    fnName: 'defineStep',
    location: formatLocation({ line, uri }, cwd),
  })
  return new StepDefinition({
    id,
    code,
    line,
    options,
    pattern,
    uri,
  })
}

const projectPath = path.join(__dirname, '..', '..')
const projectSrcPath = path.join(projectPath, 'src')
const projectLibPath = path.join(projectPath, 'lib')

function getDefinitionLineAndUri() {
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
  }
  return { line, uri }
}

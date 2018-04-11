import _ from 'lodash'
import DataTable from './data_table'
import { buildStepArgumentIterator } from '../step_arguments'

export default class StepDefinition {
  constructor({ id, code, line, options, pattern, uri }) {
    this.id = id
    this.code = code
    this.line = line
    this.options = options
    this.pattern = pattern
    this.uri = uri
  }

  buildInvalidCodeLengthMessage(syncOrPromiseLength, callbackLength) {
    return (
      `function has ${this.code.length} arguments` +
      `, should have ${syncOrPromiseLength} (if synchronous or returning a promise)` +
      ` or ${callbackLength} (if accepting a callback)`
    )
  }

  getInvalidCodeLengthMessage(parameters) {
    return this.buildInvalidCodeLengthMessage(
      parameters.length,
      parameters.length + 1
    )
  }

  getInvocationParameters({
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

  getValidCodeLengths(parameters) {
    return [parameters.length, parameters.length + 1]
  }

  toConfig() {
    return _.pick(this, ['id', 'line', 'pattern', 'uri'])
  }
}

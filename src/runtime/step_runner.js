import _ from 'lodash'
import Status from '../status'
import Time from '../time'
import UserCodeRunner from '../user_code_runner'
import colors from 'colors/safe'
import { format } from 'assertion-error-formatter'

const { beginTiming, endTiming } = Time

async function run({
  colorFns,
  defaultTimeout,
  parameters,
  stepDefinition,
  world,
}) {
  beginTiming()
  let error, result

  const timeoutInMilliseconds = stepDefinition.options.timeout || defaultTimeout

  const validCodeLengths = stepDefinition.getValidCodeLengths(parameters)
  if (_.includes(validCodeLengths, stepDefinition.code.length)) {
    const data = await UserCodeRunner.run({
      argsArray: parameters,
      fn: stepDefinition.code,
      thisArg: world,
      timeoutInMilliseconds,
    })
    error = data.error
    result = data.result
  } else {
    error = stepDefinition.getInvalidCodeLengthMessage(parameters)
  }

  const testStepResult = { duration: endTiming() }

  if (result === 'skipped') {
    testStepResult.status = Status.SKIPPED
  } else if (result === 'pending') {
    testStepResult.message = 'Pending'
    testStepResult.status = Status.PENDING
  } else if (error) {
    testStepResult.message = format(error, {
      colorFns: {
        diffAdded: colors.red,
        diffRemoved: colors.green,
        errorMessage: colors.red,
        errorStack: colors.gray,
      },
    })
    testStepResult.status = Status.FAILED
  } else {
    testStepResult.status = Status.PASSED
  }

  return testStepResult
}

export default { run }

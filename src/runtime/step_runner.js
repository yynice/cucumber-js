import _ from 'lodash'
import Status from '../status'
import Time from '../time'
import UserCodeRunner from '../user_code_runner'
import colors from 'colors/safe'
import { format } from 'assertion-error-formatter'

const { beginTiming, endTiming } = Time

async function run({
  defaultTimeout,
  generateParametersFn,
  stepDefinition,
  world,
}) {
  let duration = 0
  let error, parameters, result

  const timeoutInMilliseconds = stepDefinition.options.timeout || defaultTimeout

  try {
    parameters = await Promise.resolve(generateParametersFn())
  } catch (e) {
    error = e
  }

  if (!error) {
    const validCodeLengths = stepDefinition.getValidCodeLengths(parameters)
    if (_.includes(validCodeLengths, stepDefinition.code.length)) {
      beginTiming()
      const data = await UserCodeRunner.run({
        argsArray: parameters,
        fn: stepDefinition.code,
        thisArg: world,
        timeoutInMilliseconds,
      })
      error = data.error
      result = data.result
      duration = endTiming()
    } else {
      error = stepDefinition.getInvalidCodeLengthMessage(parameters)
    }
  }

  const testStepResult = { duration }

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

import StepDefinition from './step_definition'

export default class TestCaseHookDefinition extends StepDefinition {
  getInvalidCodeLengthMessage() {
    return this.buildInvalidCodeLengthMessage('0 or 1', '2')
  }

  getInvocationParameters({ hookParameter }) {
    return [hookParameter]
  }

  getValidCodeLengths() {
    return [0, 1, 2]
  }
}

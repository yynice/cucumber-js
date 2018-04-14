import Status from '../../status'
import KeywordType from './keyword_type'
import indentString from 'indent-string'

export function getStepMessage({ keywordType, testStep }) {
  switch (testStep.result.status) {
    case Status.AMBIGUOUS:
    case Status.FAILED:
    case Status.PENDING:
      return testStep.result.message
    case Status.UNDEFINED:
      const snippet = testStep.result.message.replace(
        '{{keywordType}}',
        getUndefinedStepResultKeyword(keywordType)
      )
      const indentedSnippet = indentString(snippet, 2)
      return `Undefined. Implement with the following snippet:\n\n${indentedSnippet}`
  }
}

export function getUndefinedStepResultKeyword(keywordType) {
  switch (keywordType) {
    case KeywordType.EVENT:
      return 'When'
    case KeywordType.OUTCOME:
      return 'Then'
    case KeywordType.PRECONDITION:
      return 'Given'
  }
}

import Status from '../../status'
import KeywordType from './keyword_type'

export function getStepMessage({ keywordType, testStep }) {
  switch (testStep.result.status) {
    case Status.AMBIGUOUS:
    case Status.FAILED:
    case Status.PENDING:
      return testStep.result.message
    case Status.UNDEFINED:
      return testStep.result.message.replace(
        '{{keyword}}',
        getUndefinedStepResultKeyword(keywordType)
      )
  }
}

function getUndefinedStepResultKeyword(keywordType) {
  switch (keywordType) {
    case KeywordType.EVENT:
      return 'When'
    case KeywordType.OUTCOME:
      return 'Then'
    case KeywordType.PRECONDITION:
      return 'Given'
  }
}

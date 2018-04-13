import { buildStepArgumentIterator } from '../../step_arguments'

export default class StepDefinitionSnippetBuilder {
  constructor({ snippetSyntax }) {
    this.snippetSyntax = snippetSyntax
  }

  parameterTypeNamesToParameterNames(parameterTypeNames) {
    const mapping = {}
    return parameterTypeNames.map(typeName => {
      if (!mapping[typeName]) {
        mapping[typeName] = 1
      }
      const result = `${typeName}${mapping[typeName]}`
      mapping[typeName] += 1
      return result
    })
  }

  build({ generatedExpressions, pickleArguments }) {
    const updatedGeneratedExpressions = generatedExpressions.map(
      ({ text, parameterTypeNames }) => {
        return {
          text,
          parameterNames: this.parameterTypeNamesToParameterNames(
            parameterTypeNames
          ),
        }
      }
    )
    const comment =
      'Write code here that turns the phrase above into concrete actions'
    const stepParameterNames = pickleArguments.map(
      buildStepArgumentIterator({
        dataTable: () => 'dataTable',
        docString: () => 'docString',
      })
    )
    return this.snippetSyntax.build({
      comment,
      generatedExpressions: updatedGeneratedExpressions,
      stepParameterNames,
    })
  }
}

import { beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import { createMock } from '../../../test/helpers'
import StepDefinitionSnippetBuilder from './'

describe('StepDefinitionSnippetBuilder', () => {
  beforeEach(function() {
    this.snippetSyntax = createMock(['build'])
    this.snippetBuilder = new StepDefinitionSnippetBuilder({
      snippetSyntax: this.snippetSyntax,
      parameterTypeRegistry: this.transformsLookup,
    })
  })

  describe('build()', () => {
    beforeEach(function() {
      this.input = {
        generatedExpressions: [{ text: '', parameterTypeNames: [] }],
        pickleArguments: [],
      }
    })

    describe('step has simple name', () => {
      beforeEach(function() {
        this.input.generatedExpressions[0].text = 'abc'
        this.result = this.snippetBuilder.build(this.input)
        this.arg = this.snippetSyntax.build.firstCall.args[0]
      })

      it('adds the proper generated expression', function() {
        expect(this.arg.generatedExpressions).to.eql([
          {
            text: 'abc',
            parameterNames: [],
          },
        ])
      })
    })

    describe('step name has a quoted string', () => {
      beforeEach(function() {
        this.input.generatedExpressions[0] = {
          text: 'abc {string} ghi',
          parameterTypeNames: ['string'],
        }
        this.result = this.snippetBuilder.build(this.input)
        this.arg = this.snippetSyntax.build.firstCall.args[0]
      })

      it('adds the proper generated expression', function() {
        expect(this.arg.generatedExpressions).to.eql([
          {
            text: 'abc {string} ghi',
            parameterNames: ['string1'],
          },
        ])
      })
    })

    describe('step name has multiple quoted strings', () => {
      beforeEach(function() {
        this.input.generatedExpressions[0] = {
          text: 'abc {string} ghi {string} mno',
          parameterTypeNames: ['string', 'string'],
        }
        this.result = this.snippetBuilder.build(this.input)
        this.arg = this.snippetSyntax.build.firstCall.args[0]
      })

      it('adds the proper generated expression', function() {
        expect(this.arg.generatedExpressions).to.eql([
          {
            text: 'abc {string} ghi {string} mno',
            parameterNames: ['string1', 'string2'],
          },
        ])
      })
    })

    describe('step has no arguments', () => {
      beforeEach(function() {
        this.result = this.snippetBuilder.build(this.input)
        this.arg = this.snippetSyntax.build.firstCall.args[0]
      })

      it('passes no step parameter names', function() {
        expect(this.arg.stepParameterNames).to.eql([])
      })
    })

    describe('step has a data table argument', () => {
      beforeEach(function() {
        this.input.pickleArguments = [{ rows: [] }]
        this.result = this.snippetBuilder.build(this.input)
        this.arg = this.snippetSyntax.build.firstCall.args[0]
      })

      it('passes dataTable as a step parameter name', function() {
        expect(this.arg.stepParameterNames).to.eql(['dataTable'])
      })
    })

    describe('step has a doc string argument', () => {
      beforeEach(function() {
        this.input.pickleArguments = [{ content: '' }]
        this.result = this.snippetBuilder.build(this.input)
        this.arg = this.snippetSyntax.build.firstCall.args[0]
      })

      it('passes docString as a step parameter name', function() {
        expect(this.arg.stepParameterNames).to.eql(['docString'])
      })
    })
  })
})

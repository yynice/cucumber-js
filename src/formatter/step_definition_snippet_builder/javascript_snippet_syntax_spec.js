import { beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import JavascriptSnippetSyntax from './javascript_snippet_syntax'

describe('JavascriptSnippetSyntax', () => {
  describe('build()', () => {
    describe('callback interface', () => {
      beforeEach(function() {
        this.syntax = new JavascriptSnippetSyntax('callback')
      })

      it('returns the proper snippet', function() {
        const actual = this.syntax.build({
          comment: 'comment',
          generatedExpressions: [
            {
              text: 'pattern',
              parameterNames: ['typeA1', 'typeA2'],
            },
          ],
          stepParameterNames: [],
        })
        const expected =
          "{{keywordType}}('pattern', function (typeA1, typeA2, callback) {\n" +
          '  // comment\n' +
          "  callback(null, 'pending');\n" +
          '});'
        expect(actual).to.eql(expected)
      })
    })

    describe('generator interface', () => {
      beforeEach(function() {
        this.syntax = new JavascriptSnippetSyntax('generator')
      })

      it('returns the proper snippet', function() {
        const actual = this.syntax.build({
          comment: 'comment',
          generatedExpressions: [
            {
              text: 'pattern',
              parameterNames: ['typeA1', 'typeA2'],
            },
          ],
          stepParameterNames: [],
        })
        const expected =
          "{{keywordType}}('pattern', function *(typeA1, typeA2) {\n" +
          '  // comment\n' +
          "  return 'pending';\n" +
          '});'
        expect(actual).to.eql(expected)
      })
    })

    describe('promise interface', () => {
      beforeEach(function() {
        this.syntax = new JavascriptSnippetSyntax('promise')
      })

      it('returns the proper snippet', function() {
        const actual = this.syntax.build({
          comment: 'comment',
          generatedExpressions: [
            {
              text: 'pattern',
              parameterNames: ['typeA1', 'typeA2'],
            },
          ],
          stepParameterNames: [],
        })
        const expected =
          "{{keywordType}}('pattern', function (typeA1, typeA2) {\n" +
          '  // comment\n' +
          "  return 'pending';\n" +
          '});'
        expect(actual).to.eql(expected)
      })
    })

    describe('synchronous interface', () => {
      beforeEach(function() {
        this.syntax = new JavascriptSnippetSyntax('synchronous')
      })

      it('returns the proper snippet', function() {
        const actual = this.syntax.build({
          comment: 'comment',
          generatedExpressions: [
            {
              text: 'pattern',
              parameterNames: ['typeA1', 'typeA2'],
            },
          ],
          stepParameterNames: [],
        })
        const expected =
          "{{keywordType}}('pattern', function (typeA1, typeA2) {\n" +
          '  // comment\n' +
          "  return 'pending';\n" +
          '});'
        expect(actual).to.eql(expected)
      })
    })

    describe('pattern contains single quote', () => {
      beforeEach(function() {
        this.syntax = new JavascriptSnippetSyntax('synchronous')
      })

      it('returns the proper snippet', function() {
        const actual = this.syntax.build({
          comment: 'comment',
          generatedExpressions: [
            {
              text: "pattern'",
              parameterNames: ['typeA1', 'typeA2'],
            },
          ],
          stepParameterNames: [],
        })
        const expected =
          "{{keywordType}}('pattern\\'', function (typeA1, typeA2) {\n" +
          '  // comment\n' +
          "  return 'pending';\n" +
          '});'
        expect(actual).to.eql(expected)
      })
    })

    describe('multiple patterns', () => {
      beforeEach(function() {
        this.syntax = new JavascriptSnippetSyntax('synchronous')
      })

      it('returns the snippet with the other choices commented out', function() {
        const actual = this.syntax.build({
          comment: 'comment',
          generatedExpressions: [
            {
              text: 'pattern1',
              parameterNames: ['typeA1', 'typeA2'],
            },
            {
              text: 'pattern2',
              parameterNames: ['typeB1', 'typeC1'],
            },
            {
              text: 'pattern3',
              parameterNames: ['typeD1', 'typeD2'],
            },
          ],
          stepParameterNames: [],
        })
        const expected =
          "{{keywordType}}('pattern1', function (typeA1, typeA2) {\n" +
          "// {{keywordType}}('pattern2', function (typeB1, typeC1) {\n" +
          "// {{keywordType}}('pattern3', function (typeD1, typeD2) {\n" +
          '  // comment\n' +
          "  return 'pending';\n" +
          '});'
        expect(actual).to.eql(expected)
      })
    })
  })
})

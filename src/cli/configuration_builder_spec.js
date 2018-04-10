import { beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import { promisify } from 'bluebird'
import ConfigurationBuilder from './configuration_builder'
import fsExtra from 'fs-extra'
import path from 'path'
import tmp from 'tmp'

const outputFile = promisify(fsExtra.outputFile)

describe('Configuration', () => {
  beforeEach(async function() {
    this.tmpDir = await promisify(tmp.dir)({ unsafeCleanup: true })
    await promisify(fsExtra.mkdirp)(path.join(this.tmpDir, 'features'))
    this.argv = ['path/to/node', 'path/to/cucumber.js']
    this.configurationOptions = {
      argv: this.argv,
      cwd: this.tmpDir,
    }
  })

  describe('no argv', () => {
    beforeEach(async function() {
      this.result = await ConfigurationBuilder.build(this.configurationOptions)
    })

    it('returns the default configuration', function() {
      expect(this.result).to.eql({
        featuresConfig: {
          absolutePaths: [],
          defaultLanguage: '',
          order: 'defined',
          filters: {
            lines: {},
            names: [],
            tagExpression: '',
          },
        },
        filterStacktraces: true,
        formatOptions: {
          colorsEnabled: true,
          cwd: this.tmpDir,
        },
        formats: [{ outputTo: '', type: 'progress' }],
        listI18nKeywordsFor: '',
        listI18nLanguages: false,
        parallel: 0,
        profiles: [],
        runtimeConfig: {
          isDryRun: false,
          isFailFast: false,
          isStrict: true,
        },
        shouldExitImmediately: false,
        supportCodePaths: [],
        supportCodeRequiredModules: [],
        worldParameters: {},
      })
    })
  })

  describe('path to a feature', () => {
    beforeEach(async function() {
      this.relativeFeaturePath = path.join('features', 'a.feature')
      this.featurePath = path.join(this.tmpDir, this.relativeFeaturePath)
      await outputFile(this.featurePath, '')
      this.supportCodePath = path.join(this.tmpDir, 'features', 'a.js')
      await outputFile(this.supportCodePath, '')
      this.argv.push(this.relativeFeaturePath)
      this.result = await ConfigurationBuilder.build(this.configurationOptions)
    })

    it('returns the appropriate feature and support code paths', async function() {
      const {
        featuresConfig: { absolutePaths: featurePaths },
        supportCodePaths,
      } = this.result
      expect(featurePaths).to.eql([this.featurePath])
      expect(supportCodePaths).to.eql([this.supportCodePath])
    })
  })

  describe('path to a feature with multiple lines', () => {
    beforeEach(async function() {
      this.relativeFeaturePath = path.join('features', 'a.feature')
      this.featurePath = path.join(this.tmpDir, this.relativeFeaturePath)
      await outputFile(this.featurePath, '')
      this.supportCodePath = path.join(this.tmpDir, 'features', 'a.js')
      await outputFile(this.supportCodePath, '')
      this.argv.push(this.relativeFeaturePath + ':1:2')
      this.result = await ConfigurationBuilder.build(this.configurationOptions)
    })

    it('returns the appropriate feature and support code paths', async function() {
      const { featuresConfig: { filters: { lines } } } = this.result
      expect(lines).to.eql({ [this.featurePath]: [1, 2] })
    })
  })

  describe('path to a nested feature', () => {
    beforeEach(async function() {
      this.relativeFeaturePath = path.join('features', 'nested', 'a.feature')
      this.featurePath = path.join(this.tmpDir, this.relativeFeaturePath)
      await outputFile(this.featurePath, '')
      this.supportCodePath = path.join(this.tmpDir, 'features', 'a.js')
      await outputFile(this.supportCodePath, '')
      this.argv.push(this.relativeFeaturePath)
      this.result = await ConfigurationBuilder.build(this.configurationOptions)
    })

    it('returns the appropriate feature and support code paths', async function() {
      const {
        featuresConfig: { absolutePaths: featurePaths },
        supportCodePaths,
      } = this.result
      expect(featurePaths).to.eql([this.featurePath])
      expect(supportCodePaths).to.eql([this.supportCodePath])
    })
  })

  describe('formatters', () => {
    it('adds a default', async function() {
      const formats = await getFormats(this.configurationOptions)
      expect(formats).to.eql([{ outputTo: '', type: 'progress' }])
    })

    it('splits relative unix paths', async function() {
      this.argv.push('-f', '../custom/formatter:../formatter/output.txt')
      const formats = await getFormats(this.configurationOptions)

      expect(formats).to.eql([
        { outputTo: '', type: 'progress' },
        { outputTo: '../formatter/output.txt', type: '../custom/formatter' },
      ])
    })

    it('splits absolute unix paths', async function() {
      this.argv.push('-f', '/custom/formatter:/formatter/output.txt')
      const formats = await getFormats(this.configurationOptions)

      expect(formats).to.eql([
        { outputTo: '', type: 'progress' },
        { outputTo: '/formatter/output.txt', type: '/custom/formatter' },
      ])
    })

    it('splits absolute windows paths', async function() {
      this.argv.push('-f', 'C:\\custom\\formatter:D:\\formatter\\output.txt')
      const formats = await getFormats(this.configurationOptions)

      expect(formats).to.eql([
        { outputTo: '', type: 'progress' },
        {
          outputTo: 'D:\\formatter\\output.txt',
          type: 'C:\\custom\\formatter',
        },
      ])
    })

    it('does not split absolute windows paths without an output', async function() {
      this.argv.push('-f', 'C:\\custom\\formatter')
      const formats = await getFormats(this.configurationOptions)

      expect(formats).to.eql([{ outputTo: '', type: 'C:\\custom\\formatter' }])
    })

    async function getFormats(options) {
      const result = await ConfigurationBuilder.build(options)
      return result.formats
    }
  })
})

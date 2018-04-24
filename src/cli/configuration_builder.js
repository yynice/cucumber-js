import _ from 'lodash'
import ArgvParser from './argv_parser'
import fs from 'mz/fs'
import path from 'path'
import OptionSplitter from './option_splitter'
import Promise, { promisify } from 'bluebird'
import glob from 'glob'

const FEATURE_LINENUM_REGEXP = /^(.*?)((?::[\d]+)+)?$/
const globP = promisify(glob)

export default class ConfigurationBuilder {
  static async build(options) {
    const builder = new ConfigurationBuilder(options)
    return builder.build()
  }

  constructor({ argv, cwd }) {
    this.cwd = cwd

    const parsedArgv = ArgvParser.parse(argv)
    this.args = parsedArgv.args
    this.options = parsedArgv.options
  }

  async build() {
    const listI18nKeywordsFor = this.options.i18nKeywords
    const listI18nLanguages = !!this.options.i18nLanguages
    const unexpandedFeaturePaths = await this.getUnexpandedFeaturePaths()
    let featurePaths = []
    let supportCodePaths = []
    if (!listI18nKeywordsFor && !listI18nLanguages) {
      featurePaths = await this.expandFeaturePaths(unexpandedFeaturePaths)
      let unexpandedSupportCodePaths = this.options.require
      if (unexpandedSupportCodePaths.length === 0) {
        unexpandedSupportCodePaths = this.getFeatureDirectoryPaths(featurePaths)
      }
      supportCodePaths = await this.expandPaths(
        unexpandedSupportCodePaths,
        '.js'
      )
    }
    return {
      featuresConfig: {
        absolutePaths: featurePaths,
        language: this.options.language,
        filters: {
          names: this.options.name,
          tagExpression: this.options.tags,
          lines: this.getFeatureUriToLinesMapping(unexpandedFeaturePaths),
        },
        order: this.getFeaturesOrder(),
      },
      filterStacktraces: !this.options.backtrace,
      formats: this.getFormats(),
      formatOptions: this.getFormatOptions(),
      listI18nKeywordsFor,
      listI18nLanguages,
      profiles: this.options.profile,
      runtimeConfig: {
        isDryRun: !!this.options.dryRun,
        isFailFast: !!this.options.failFast,
        isStrict: !!this.options.strict,
        maxParallel: this.options.parallel,
      },
      shouldExitImmediately: !!this.options.exit,
      supportCodePaths,
      supportCodeRequiredModules: this.options.requireModule,
      worldParameters: this.options.worldParameters,
    }
  }

  async expandPaths(unexpandedPaths, defaultExtension) {
    const expandedPaths = await Promise.map(
      unexpandedPaths,
      async unexpandedPath => {
        const matches = await globP(unexpandedPath, {
          absolute: true,
          cwd: this.cwd,
        })
        return Promise.map(matches, async match => {
          if (path.extname(match) === '') {
            return globP(`${match}/**/*${defaultExtension}`)
          }
          return match
        })
      }
    )
    return _.flattenDepth(expandedPaths, 2).map(x => path.normalize(x))
  }

  async expandFeaturePaths(featurePaths) {
    featurePaths = featurePaths.map(p => p.replace(/(:\d+)*$/g, '')) // Strip line numbers
    return this.expandPaths(featurePaths, '.feature')
  }

  getFeatureDirectoryPaths(featurePaths) {
    const featureDirs = featurePaths.map(featurePath => {
      let featureDir = path.dirname(featurePath)
      let childDir
      let parentDir = featureDir
      while (childDir !== parentDir) {
        childDir = parentDir
        parentDir = path.dirname(childDir)
        if (path.basename(parentDir) === 'features') {
          featureDir = parentDir
          break
        }
      }
      return path.relative(this.cwd, featureDir)
    })
    return _.uniq(featureDirs)
  }

  getFeaturesOrder() {
    let [type, seed] = this.options.order.split(':')
    switch (type) {
      case 'defined':
        return { type }
      case 'random':
        if (!seed) {
          seed = Math.floor(Math.random() * 1000 * 1000).toString()
          console.warn(`Random order using seed: ${seed}`)
        } else {
          seed = parseInt(seed)
        }
        return { type, seed }
      default:
        throw new Error(
          'Unrecgonized order type. Should be `defined` or `random`'
        )
    }
  }

  getFormatOptions() {
    const formatOptions = _.clone(this.options.formatOptions)
    formatOptions.cwd = this.cwd
    _.defaults(formatOptions, { colorsEnabled: true })
    return formatOptions
  }

  getFormats() {
    const mapping = { '': 'progress' }
    this.options.format.forEach(format => {
      const [type, outputTo] = OptionSplitter.split(format)
      mapping[outputTo || ''] = type
    })
    return _.map(mapping, (type, outputTo) => ({ outputTo, type }))
  }

  getFeatureUriToLinesMapping(featurePaths) {
    const mapping = {}
    featurePaths.forEach(featurePath => {
      const match = FEATURE_LINENUM_REGEXP.exec(featurePath)
      if (match) {
        const uri = path.join(this.cwd, match[1])
        const linesExpression = match[2]
        if (linesExpression) {
          if (!mapping[uri]) {
            mapping[uri] = []
          }
          linesExpression
            .slice(1)
            .split(':')
            .forEach(line => {
              mapping[uri].push(parseInt(line))
            })
        }
      }
    })
    return mapping
  }

  async getUnexpandedFeaturePaths() {
    if (this.args.length > 0) {
      const nestedFeaturePaths = await Promise.map(this.args, async arg => {
        const filename = path.basename(arg)
        if (filename[0] === '@') {
          const filePath = path.join(this.cwd, arg)
          const content = await fs.readFile(filePath, 'utf8')
          return _.chain(content)
            .split('\n')
            .map(_.trim)
            .compact()
            .value()
        }
        return arg
      })
      const featurePaths = _.flatten(nestedFeaturePaths)
      if (featurePaths.length > 0) {
        return featurePaths
      }
    }
    return ['features/**/*.feature']
  }
}

import { EventDataCollector } from '../formatter/helpers'
import { getExpandedArgv } from './helpers'
import { validateInstall } from './install_validator'
import * as I18n from './i18n'
import ConfigurationBuilder from './configuration_builder'
import EventEmitter from 'events'
import FormatterBuilder from '../formatter/builder'
import fs from 'mz/fs'
import path from 'path'
import Promise from 'bluebird'
import Runtime from '../runtime/shared'
import supportCodeLibraryBuilder from '../support_code_library_builder'
import JavascriptSnippetSyntax from '../formatter/step_definition_snippet_builder/javascript_snippet_syntax'
import StepDefinitionSnippetBuilder from '../formatter/step_definition_snippet_builder'

export default class Cli {
  static getStepDefinitionSnippetBuilder({
    cwd,
    snippetInterface,
    snippetSyntax,
  }) {
    if (!snippetInterface) {
      snippetInterface = 'synchronous'
    }
    let Syntax = JavascriptSnippetSyntax
    if (snippetSyntax) {
      const fullSyntaxPath = path.resolve(cwd, snippetSyntax)
      Syntax = require(fullSyntaxPath)
    }
    return new StepDefinitionSnippetBuilder({
      snippetSyntax: new Syntax(snippetInterface),
    })
  }

  constructor({ argv, cwd, stdout }) {
    this.argv = argv
    this.cwd = cwd
    this.stdout = stdout
  }

  async getConfiguration() {
    const fullArgv = await getExpandedArgv({ argv: this.argv, cwd: this.cwd })
    return ConfigurationBuilder.build({ argv: fullArgv, cwd: this.cwd })
  }

  async initializeFormatters({
    eventBroadcaster,
    formatOptions,
    formats,
    supportCodeLibrary,
  }) {
    const streamsToClose = []
    const eventDataCollector = new EventDataCollector(eventBroadcaster)
    await Promise.map(formats, async ({ type, outputTo }) => {
      let stream = this.stdout
      if (outputTo) {
        const fd = await fs.open(path.resolve(this.cwd, outputTo), 'w')
        stream = fs.createWriteStream(null, { fd })
        streamsToClose.push(stream)
      }
      const typeOptions = {
        eventBroadcaster,
        eventDataCollector,
        log: ::stream.write,
        stream,
        supportCodeLibrary,
        ...formatOptions,
      }
      return FormatterBuilder.build(type, typeOptions)
    })
    return function() {
      return Promise.each(streamsToClose, stream =>
        Promise.promisify(::stream.end)()
      )
    }
  }

  getSupportCodeLibrary({ supportCodeRequiredModules, supportCodePaths }) {
    supportCodeRequiredModules.map(module => require(module))
    supportCodeLibraryBuilder.reset(this.cwd)
    supportCodePaths.forEach(codePath => require(codePath))
    return supportCodeLibraryBuilder.finalize()
  }

  async run() {
    await validateInstall(this.cwd)
    const configuration = await this.getConfiguration()
    if (configuration.listI18nLanguages) {
      this.stdout.write(I18n.getLanguages())
      return { success: true }
    }
    if (configuration.listI18nKeywordsFor) {
      this.stdout.write(I18n.getKeywords(configuration.listI18nKeywordsFor))
      return { success: true }
    }
    const supportCodeLibrary = this.getSupportCodeLibrary(configuration)
    const eventBroadcaster = new EventEmitter()
    const cleanup = await this.initializeFormatters({
      eventBroadcaster,
      formatOptions: configuration.formatOptions,
      formats: configuration.formats,
      supportCodeLibrary,
    })
    const stepDefinitionSnippetBuilder = Cli.getStepDefinitionSnippetBuilder(
      configuration.formatOptions
    )
    const runtime = new Runtime({
      cwd: this.cwd,
      eventBroadcaster,
      featuresConfig: configuration.featuresConfig,
      runtimeConfig: configuration.runtimeConfig,
      stepDefinitionSnippetBuilder,
      supportCodeLibrary: supportCodeLibrary,
      filterStacktraces: configuration.filterStacktraces,
      worldParameters: configuration.worldParameters,
    })
    const success = await runtime.run()
    await cleanup()
    return {
      shouldExitImmediately: configuration.shouldExitImmediately,
      success,
    }
  }
}

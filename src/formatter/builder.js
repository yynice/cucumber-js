import EventProtocolFormatter from './event_protocol_formatter'
import getColorFns from './get_color_fns'
import JsonFormatter from './json_formatter'
import path from 'path'
import ProgressBarFormatter from './progress_bar_formatter'
import ProgressFormatter from './progress_formatter'
import RerunFormatter from './rerun_formatter'
import SnippetsFormatter from './snippets_formatter'
import SummaryFormatter from './summary_formatter'
import UsageFormatter from './usage_formatter'
import UsageJsonFormatter from './usage_json_formatter'

export default class FormatterBuilder {
  static build(type, options) {
    const Formatter = FormatterBuilder.getConstructorByType(type, options)
    const extendedOptions = {
      colorFns: getColorFns(options.colorsEnabled),
      ...options,
    }
    return new Formatter(extendedOptions)
  }

  static getConstructorByType(type, options) {
    switch (type) {
      case 'event-protocol':
        return EventProtocolFormatter
      case 'json':
        return JsonFormatter
      case 'progress':
        return ProgressFormatter
      case 'progress-bar':
        return ProgressBarFormatter
      case 'rerun':
        return RerunFormatter
      case 'snippets':
        return SnippetsFormatter
      case 'summary':
        return SummaryFormatter
      case 'usage':
        return UsageFormatter
      case 'usage-json':
        return UsageJsonFormatter
      default:
        return FormatterBuilder.loadCustomFormatter(type, options)
    }
  }

  static loadCustomFormatter(customFormatterPath, { cwd }) {
    const fullCustomFormatterPath = path.resolve(cwd, customFormatterPath)
    const CustomFormatter = require(fullCustomFormatterPath)
    if (typeof CustomFormatter === 'function') {
      return CustomFormatter
    } else if (
      CustomFormatter &&
      typeof CustomFormatter.default === 'function'
    ) {
      return CustomFormatter.default
    }
    throw new Error(
      `Custom formatter (${customFormatterPath}) does not export a function`
    )
  }
}

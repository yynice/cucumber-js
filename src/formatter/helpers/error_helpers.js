import colors from 'colors/safe'
import { format } from 'assertion-error-formatter'

export function formatError(error) {
  return format(error, {
    colorFns: {
      diffAdded: colors.red,
      diffRemoved: colors.green,
      errorMessage: colors.red,
      errorStack: colors.gray,
    },
  })
}

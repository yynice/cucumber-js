import path from 'path'

export function formatLocation(obj, cwd) {
  return `${path.relative(cwd, obj.uri)}:${obj.line}`
}

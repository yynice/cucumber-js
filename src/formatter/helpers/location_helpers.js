import path from 'path'

export function formatLocation(obj, cwd) {
  let relativeUri = obj.uri
  if (cwd) {
    relativeUri = path.relative(cwd, obj.uri)
  }
  return `${relativeUri}:${obj.line}`
}

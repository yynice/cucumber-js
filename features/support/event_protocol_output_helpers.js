import path from 'path'

export function normalizeEventProtocolOutput(str, baseDir) {
  return str
    .replace(/"duration":\d*/g, '"duration":0')
    .replace(/<cwd([^>]*)>/g, (match, suffix) => path.join(baseDir, suffix))
}

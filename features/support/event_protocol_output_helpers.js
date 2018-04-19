import path from 'path'

export function normalizeEventProtocolOutput(str, baseDir) {
  return str
    .replace(/"duration":\d*/g, '"duration":0')
    .replace(new RegExp('<cwd>', 'g'), path.posix.normalize(baseDir))
}

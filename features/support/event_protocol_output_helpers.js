import path from 'path'

export function normalizeEventProtocolOutput(str, baseDir) {
  return str
    .replace(/"duration":\d*/g, '"duration":0')
    .replace(new RegExp('<cwd>', 'g'), baseDir)
    .replace(
      /"uri":"([^"]*)"/g,
      (match, uri) => `"uri":"${path.normalize(uri)}"`
    )
}

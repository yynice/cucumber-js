export function normalizeEventProtocolOutput(str, baseDir) {
  const normalizedBaseDir = baseDir.replace(/\\/g, '/')
  return str
    .replace(/"duration":\d*/g, '"duration":0')
    .replace(/<cwd>/g, normalizedBaseDir)
    .replace(
      /"uri":"([^"]*)"/g,
      (match, uri) => `"uri":"${uri.replace(/\\\\/g, '/')}"`
    )
}

export function normalizeEventProtocolOutput(str, baseDir) {
  const normalizedBaseDir = baseDir.replace(/\\\\/, '/')
  return str
    .replace(/"duration":\d*/g, '"duration":0')
    .replace(/<cwd>/g, normalizedBaseDir)
}

export function normalizeEventProtocolOutput(str, baseDir) {
  return str
    .replace(/"duration":\d*/g, '"duration":0')
    .replace(new RegExp(baseDir, 'g'), '<cwd>')
}

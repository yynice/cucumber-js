const methods = {
  clearInterval: clearInterval.bind(global),
  clearTimeout: clearTimeout.bind(global),
  Date,
  getTimestamp() {
    return new methods.Date().getTime()
  },
  setInterval: setInterval.bind(global),
  setTimeout: setTimeout.bind(global),
}

if (typeof setImmediate !== 'undefined') {
  methods.setImmediate = setImmediate.bind(global)
  methods.clearImmediate = clearImmediate.bind(global)
}

export default methods

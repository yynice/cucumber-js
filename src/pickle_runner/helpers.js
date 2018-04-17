import path from 'path'
import os from 'os'

const errorSuffix =
  'Please open an issue with your the node output of "process.platform" (operating system) and "process.arch" (system architecture).'
const version = 'v0.0.1'

export function getGoBinaryOperatingSystem() {
  switch (process.platform) {
    case 'darwin':
      return 'darwin'
    case 'linux':
      return 'linux'
    case 'win32':
      return 'windows'
    default:
      throw new Error(`Unsupported operating system. ${errorSuffix}`)
  }
}

export function getGoBinaryArchitecture() {
  switch (process.arch) {
    case 'arm':
      return 'arm'
    case 'i32':
      return '386'
    case 'x64':
      return 'amd64'
    default:
      throw new Error(`Unsupported system architecture. ${errorSuffix}`)
  }
}

export function getBinaryLocalPath() {
  return path.join(os.homedir(), 'cucumber', 'pickle-runner', version)
}

export function getBinaryRemoteUrl() {
  const urlPrefix =
    'https://github.com/cucumber/cucumber-pickle-runner/releases/download/'
  const binaryName = `cucumber-pickle-runner-${getGoBinaryOperatingSystem()}-${getGoBinaryArchitecture()}`
  return `${urlPrefix}/${version}/${binaryName}`
}

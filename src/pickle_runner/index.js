import path from 'path'
import os from 'os'

export const version = 'v0.0.2'

function throwUnsupportedErrorMessage() {
  throw new Error(
    `Unsupported operating system (${process.platform}) and system architecture (${process.arch}) combination. Please open an issue on cucumber-js.`
  )
}

function getGoBinaryOperatingSystem() {
  switch (process.platform) {
    case 'darwin':
      return 'darwin'
    case 'freebsd':
      return 'freebsd'
    case 'linux':
      return 'linux'
    case 'win32':
      return 'windows'
    case 'openbsd':
      return 'openbsd'
    default:
      throwUnsupportedErrorMessage()
  }
}

function getGoBinaryArchitecture() {
  switch (process.arch) {
    case 'arm':
      return 'arm'
    case 'i32':
    case 'x32':
      return '386'
    case 'x64':
      return 'amd64'
    case 'mips':
      return 'mips'
    case 'mipsel':
      return 'mipsle'
    case 's390x':
      return 's390x'
    default:
      throwUnsupportedErrorMessage()
  }
}

export function getBinaryLocalPath() {
  return path.join(os.homedir(), 'cucumber', 'pickle-runner', version)
}

export function getBinaryRemoteUrl(platform, arch) {
  const urlPrefix =
    'https://github.com/cucumber/cucumber-pickle-runner/releases/download'
  const binaryName = `cucumber-pickle-runner-${getGoBinaryOperatingSystem()}-${getGoBinaryArchitecture()}`
  return `${urlPrefix}/${version}/${binaryName}`
}

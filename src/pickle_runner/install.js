import fs from 'mz/fs'
import fsExtra from 'fs-extra'
import { getBinaryLocalPath, getBinaryRemoteUrl, version } from './'
import request from 'request'
import path from 'path'

export default async function install() {
  const localPath = getBinaryLocalPath()

  await fsExtra.ensureDir(path.dirname(localPath))
  let exists = true
  try {
    await fs.access(localPath)
  } catch (err) {
    if (err.code === 'ENOENT') {
      exists = false
    } else {
      throw err
    }
  }
  if (exists) {
    console.log(`cucumber-pickle-runner ${version} already installed`)
    return
  }

  console.log(`Installing cucumber-pickle-runner ${version}`)
  await new Promise((resolve, reject) => {
    const remoteUrl = getBinaryRemoteUrl()
    request
      .get(remoteUrl)
      .on('error', reject)
      .on('response', response => {
        if (response.statusCode >= 400) {
          reject(
            new Error(
              `Fetching ${remoteUrl} responded with status ${response.statusCode}`
            )
          )
          return
        }
        response
          .pipe(fs.createWriteStream(localPath, { mode: 0o755 }))
          .on('error', reject)
          .on('finish', resolve)
      })
  })
}

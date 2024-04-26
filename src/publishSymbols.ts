import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import path from 'path'
import axios from 'axios'
import * as hlp from './Helpers'
import fs from 'fs'
import * as io from '@actions/io'
import * as os from 'os'
import {ok} from 'assert'
import * as semver from 'semver'

var isWindows: boolean = os.type() == 'Windows_NT'

export async function downloadSymbolClient(downloadUri: string, directory: string): Promise<string> {
  const symbolAppZip = path.join(directory, 'symbol.app.buildtask.zip')

  core.debug(`Downloading ${downloadUri} to ${symbolAppZip}`)

  if (fs.existsSync(symbolAppZip)) {
    core.debug(`Deleting file found at ${symbolAppZip}`)
    await io.rmRF(symbolAppZip)
  }

  const symbolPath = await tc.downloadTool(downloadUri, symbolAppZip)

  core.debug('Download complete')

  return symbolPath
}

export async function getSymbolClientVersion(
  accountName: string,
  symbolServiceUri: string,
  personalAccessToken: string
): Promise<any> {
  core.debug('Getting latest symbol.app.buildtask.zip package')

  if (!isWindows) {
    var clientFetchUrl = `https://vsblob.dev.azure.com/${accountName}/_apis/clienttools/symbol/release?osName=linux&arch=x86_64`
    const encodedBase64Token = Buffer.from(`${''}:${personalAccessToken}`).toString('base64')

    const response = await axios.get(clientFetchUrl, {
      headers: {
        Authorization: `Basic ${encodedBase64Token}`
      }
    })

    if (response.status == 401) {
      throw Error("Verify that PAT isn't expired and has build scope permission")
    } else if (response.status >= 300) {
      throw Error("Client download URL couldn't be retrieved")
    }

    const versionNumber = response.data.version as string
    const downloadUri = response.data.uri as string
    core.debug(`Most recent version is ${versionNumber}`)
    return {versionNumber, downloadUri}
  } else {
    var clientFetchUrl = `${symbolServiceUri}/_apis/symbol/client/`

    const response = await axios.head(clientFetchUrl)
    const versionNumber = response.headers['symbol-client-version'] as string
    const downloadUri = `${symbolServiceUri}/_apis/symbol/client/task`
    core.debug(`Most recent version is ${versionNumber}`)
    return {versionNumber, downloadUri}
  }
}

export async function runSymbolCommand(assemblyPath: string, args: string): Promise<void> {
  var exe
  if (isWindows) {
    exe = path.join(assemblyPath, 'symbol.exe')
  } else {
    exe = path.join(assemblyPath, 'symbol')
    await exec.exec(`chmod 755 ${exe}`) // Set the symbol command executable by giving appropriate permission
  }

  const traceLevel = core.isDebug() ? 'verbose' : 'info'
  const finalArgs = `${args} --tracelevel ${traceLevel} --globalretrycount 2`

  core.info(`Executing: ${exe} ${finalArgs}`)
  const result = await exec.exec(`${exe} ${finalArgs}`)

  if (result !== 0) {
    throw Error(`${exe} exited with code ${result}`)
  }
}

export async function unzipSymbolClient(clientZip: string, destinationDirectory: string): Promise<void> {
  core.debug(`Unzipping ${clientZip}`)

  if (fs.existsSync(destinationDirectory)) {
    core.debug(`Deleting folder found at ${destinationDirectory}`)
    await io.rmRF(destinationDirectory)
  }

  core.debug(`Creating ${destinationDirectory}`)
  await io.mkdirP(destinationDirectory)

  var result = ''
  if (isWindows) {
    result = await tc.extractZip(clientZip, destinationDirectory)
  } else {
    try {
      await exec.exec(`/usr/bin/unzip -o -q ${clientZip} -d ${destinationDirectory}`)
      result = destinationDirectory
    } catch (e) {
      core.warning('Encountered some issues while unzipping.')
    }
  }
  core.debug(`Unzipped - ${result}`)
}

export async function updateSymbolClient(
  accountName: string,
  symbolServiceUri: string,
  personalAccessToken: string
): Promise<string> {
  core.debug('Checking for most recent symbol.app.buildtask.zip version')

  const {versionNumber, downloadUri} = await getSymbolClientVersion(accountName, symbolServiceUri, personalAccessToken)
  const toolName = 'SymbolClient'
  const zipName = 'symbol.app.buildtask'

  // Look up the tool path to see if it's been cached already
  // Note: SymbolClient does not use strict semver, so we have to use our own copy of the find() function
  let toolPath = find(toolName, versionNumber, 'x64')

  // If not tool was found in the cache for the latest version, download and cache it
  if (toolPath === '') {
    core.debug(`Tool: ${toolName}, version: ${versionNumber} not found, downloading...`)

    const baseDownloadPath = path.join(hlp.getTempPath(), toolName, versionNumber)

    // If a previous download exists, clean it up before downloading again
    if (fs.existsSync(baseDownloadPath)) {
      core.debug(`Cleaning ${baseDownloadPath}`)
      await io.rmRF(baseDownloadPath)
    }

    core.debug(`Creating ${baseDownloadPath}`)

    await io.mkdirP(baseDownloadPath)

    const symbolClientZip = await downloadSymbolClient(downloadUri, baseDownloadPath)
    const unzipPath = path.join(baseDownloadPath, zipName)

    await unzipSymbolClient(symbolClientZip, unzipPath)

    // Cache the tool for future use
    toolPath = await tc.cacheDir(unzipPath, toolName, versionNumber)

    core.debug(`Cached tool ${toolName}, version: ${versionNumber} at '${toolPath}'`)
  } else {
    core.debug(`Cached tool ${toolName}, version: ${versionNumber} found at '${toolPath}`)
  }

  // add on the lib\net45 path to the actual executable
  toolPath = isWindows ? path.join(toolPath, 'lib', 'net45') : toolPath

  return toolPath
}

export async function publishSymbols(
  accountName: string,
  symbolServiceUri: string,
  requestName: string,
  sourcePath: string,
  sourcePathListFileName: string,
  expirationInDays: string,
  personalAccessToken: string
): Promise<void> {
  core.debug(`Using endpoint ${symbolServiceUri} to create request ${requestName} with content in ${sourcePath}`)

  // the latest symbol.app.buildtask.zip and use the assemblies in it.
  const assemblyPath = await updateSymbolClient(accountName, symbolServiceUri, personalAccessToken)

  // Publish the files
  try {
    // if the last char in the source path is \, remove it
    if (sourcePath.endsWith('\\')) {
      sourcePath = sourcePath.substr(0, sourcePath.length - 1)
      core.debug(`Removed trailing '\\' in sourcePath. New value: ${sourcePath}`)
    }

    let args = `publish --service "${symbolServiceUri}" --name "${requestName}" --directory "${sourcePath}"`

    if (expirationInDays) {
      args += ` --expirationInDays "${expirationInDays}"`
    }

    core.exportVariable('SYMBOL_PAT_AUTH_TOKEN', personalAccessToken)
    args += ` --patAuthEnvVar SYMBOL_PAT_AUTH_TOKEN`

    if (sourcePathListFileName) {
      if (!fs.existsSync(sourcePathListFileName)) {
        core.warning(`File ${sourcePathListFileName} not found}`)
      } else {
        args += ` --fileListFileName "${sourcePathListFileName}"`
      }
    }

    await runSymbolCommand(assemblyPath, args)
  } catch (err) {
    core.error(`Error ${err}`)
    throw err
  }
}

export function unpublishSymbols(Share: string, TransactionId: string): void {
  const symstoreArgs = `del /i "${TransactionId} /s "${Share}"`
  core.debug(symstoreArgs)

  core.info(`Executing symstore.exe ${symstoreArgs}`)
}

export async function getSymbolServiceUri(collectionUri: string, personalAccessToken: string): Promise<string> {
  const serviceDefinitionUri = `${collectionUri}/_apis/servicedefinitions/locationservice2/951917ac-a960-4999-8464-e3f0aa25b381`

  let artifactsUri = ''

  const auth = {auth: {username: '', password: personalAccessToken}}

  let response = await axios.get(serviceDefinitionUri, auth)

  if (response.status === 200) {
    const locationUri = response.data.locationMappings[0].location

    if (!locationUri) {
      throw Error(`No location mappings found while querying ${serviceDefinitionUri}`)
    }

    const locationServiceUri = `${locationUri}/_apis/servicedefinitions/locationservice2/00000016-0000-8888-8000-000000000000`

    response = await axios.get(locationServiceUri, auth)

    if (response.status !== 200) {
      throw Error(
        `Failure while querying '${locationServiceUri}', returned (${response.status} - ${response.statusText})`
      )
    }

    artifactsUri = response.data.locationMappings[0].location

    if (!artifactsUri) {
      core.error(`No location mappings found while querying ${artifactsUri}`)
    }
    core.info(`Retrieved artifact service url: '${artifactsUri}'`)
  } else {
    core.error(`Symbol server not found at ${collectionUri}`)
  }

  return artifactsUri
}

/**
 * Finds the path to a tool version in the local installed tool cache
 *
 * @param toolName      name of the tool
 * @param versionSpec   version of the tool
 * @param arch          optional arch.  defaults to arch of computer
 */
export function find(toolName: string, versionSpec: string, arch?: string): string {
  if (!toolName) {
    throw new Error('toolName parameter is required')
  }

  if (!versionSpec) {
    throw new Error('versionSpec is a required parameter')
  }

  arch = arch || os.arch()

  // attempt to resolve an explicit version
  if (!_isExplicitVersion(versionSpec)) {
    const localVersions: string[] = findAllVersions(toolName, arch)
    const match = _evaluateVersions(localVersions, versionSpec)
    versionSpec = match
  }

  // check for the explicit version in the cache
  let toolPath = ''
  if (versionSpec) {
    const cachePath = path.join(_getCacheDirectory(), toolName, versionSpec, arch)
    core.debug(`checking cache: ${cachePath}`)
    if (fs.existsSync(cachePath) && fs.existsSync(`${cachePath}.complete`)) {
      core.debug(`Found tool in cache ${toolName} ${versionSpec} ${arch}`)
      toolPath = cachePath
    } else {
      core.debug('not found')
    }
  }
  return toolPath
}

/**
 * Finds the paths to all versions of a tool that are installed in the local tool cache
 *
 * @param toolName  name of the tool
 * @param arch      optional arch.  defaults to arch of computer
 */
export function findAllVersions(toolName: string, arch?: string): string[] {
  const versions: string[] = []

  arch = arch || os.arch()
  const toolPath = path.join(_getCacheDirectory(), toolName)

  if (fs.existsSync(toolPath)) {
    const children: string[] = fs.readdirSync(toolPath)
    for (const child of children) {
      if (_isExplicitVersion(child)) {
        const fullPath = path.join(toolPath, child, arch || '')
        if (fs.existsSync(fullPath) && fs.existsSync(`${fullPath}.complete`)) {
          versions.push(child)
        }
      }
    }
  }

  return versions
}

/**
 * Finds the paths to all versions of a tool that are installed in the local tool cache
 *
 * @param versions      a list of versions to evaluate
 * @param versionSpec   version of the tool
 */
function _evaluateVersions(versions: string[], versionSpec: string): string {
  let version = ''
  core.debug(`evaluating ${versions.length} versions`)
  versions = versions.sort((a, b) => {
    if (semver.gt(a, b)) {
      return 1
    }
    return -1
  })
  for (let i = versions.length - 1; i >= 0; i--) {
    const potential: string = versions[i]
    const satisfied: boolean = semver.satisfies(potential, versionSpec)
    if (satisfied) {
      version = potential
      break
    }
  }

  if (version) {
    core.debug(`matched: ${version}`)
  } else {
    core.debug('match not found')
  }

  return version
}

/**
 * Gets RUNNER_TOOL_CACHE
 */
function _getCacheDirectory(): string {
  const cacheDirectory = process.env['RUNNER_TOOL_CACHE'] || ''
  ok(cacheDirectory, 'Expected RUNNER_TOOL_CACHE to be defined')
  return cacheDirectory
}

function _isExplicitVersion(versionSpec: string): boolean {
  const c = semver.clean(versionSpec, {loose: true}) || ''
  core.debug(`isExplicit: ${c}`)

  const valid = semver.valid(c) != null
  core.debug(`explicit? ${valid}`)

  return valid
}

import * as ps from '../src/PublishSymbols'
import path from 'path'
import * as fs from 'fs'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import {countReset} from 'console'
import * as core from '@actions/core'
import * as hlp from '../src/Helpers'

test('test getTempPath', async () => {
  const {symbolServiceUri, patToken} = getSymbolServerUrl()
  let {versionNumber, downloadUri} = await ps.getSymbolClientVersion('testAdoAccount', symbolServiceUri, patToken)
  expect(versionNumber.length).toBeGreaterThan(0)
})

test('downloadSymbolClient', async () => {
  const {symbolServiceUri, patToken} = getSymbolServerUrl()
  const symbolPathBase = path.join(hlp.getEnvVar('RUNNER_TEMP'), 'SymbolClient')
  const symbolClientVersion = '1.0.0'
  let symbolPath = path.join(symbolPathBase, symbolClientVersion)
  let result = await ps.downloadSymbolClient(symbolServiceUri, symbolPath)
  expect(result.length).toBeGreaterThan(0)
})

test('unzipSymbol', async () => {
  const {symbolServiceUri, patToken} = getSymbolServerUrl()
  const symbolPathBase = path.join(hlp.getEnvVar('RUNNER_TEMP'), 'SymbolClient')
  const symbolClientVersion = '1.0.0'
  let symbolPath = path.join(symbolPathBase, symbolClientVersion)
  const pathToZip = await ps.downloadSymbolClient(symbolServiceUri, symbolPath)
  const unzipSymbolDestination = path.join(symbolPath, 'symbol.app.buildtask')
  await ps.unzipSymbolClient(pathToZip, unzipSymbolDestination)
})

test('downloadAndCache', async () => {
  const symbolClientVersion = '1.0.0'
  const {symbolServiceUri, patToken} = getSymbolServerUrl()
  let toolPath = ps.find('SymbolClient', symbolClientVersion)
  const symbolPathBase = path.join(hlp.getEnvVar('RUNNER_TEMP'), 'SymbolClient')
  let symbolPath = path.join(symbolPathBase, symbolClientVersion)
  expect(toolPath).toContain('')
  const symbolZipPath = await ps.downloadSymbolClient(symbolServiceUri, symbolPath)
  const unzipSymbolDestination = path.join(symbolPath, 'symbol.app.buildtask')
  await ps.unzipSymbolClient(symbolZipPath, unzipSymbolDestination)
  let cacheResult = await tc.cacheDir(unzipSymbolDestination, 'SymbolClient', symbolClientVersion)
  toolPath = ps.find('SymbolClient', symbolClientVersion)
  expect(toolPath).toHaveLength
})

// test('updateSymbolClient', async () => {
//   const {symbolServiceUri, patToken} = getSymbolServerUrl()
//   let toolPath = await ps.updateSymbolClient("1es-cat", symbolServiceUri, patToken)
//   expect(toolPath).not.toBeNull();
//   // const allVersions = ps.findAllVersions('SymbolClient')
//   // for (let version in allVersions) {
//   //   console.debug(`Version: ${version}`)
//   // }
// })

// test('getSymbolServiceUri', async () => {
//   const {symbolServiceUri, patToken} = getSymbolServerUrl()
//   const artifactUrl = await ps.getSymbolServiceUri(symbolServiceUri, patToken)
//   expect(artifactUrl.length).toBeGreaterThan(0)
// })

function getSymbolServerUrl(): any {
  jest.mock('@actions/core')
  jest.spyOn(core, 'getInput').mockReturnValueOnce('1es-cat').mockReturnValueOnce('https://artifacts.dev.azure.com')
  const accountName = core.getInput('accountName') as string
  const symbolServiceUri = `${core.getInput('symbolServiceUrl')}/${accountName}/_apis/symbol/client/task` as string
  const patToken = 'patToken'
  return {symbolServiceUri, patToken}
}

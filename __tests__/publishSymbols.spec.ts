import {
  downloadSymbolClient,
  find,
  getSymbolClientVersion,
  getSymbolServiceUri,
  publishSymbols,
  runSymbolCommand,
  unpublishSymbols,
  unzipSymbolClient,
  updateSymbolClient
} from '../src/publishSymbols'
const fs = require('fs')
import * as tc from '@actions/tool-cache'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as os from 'os'
import axios from 'axios'
import * as exec from '@actions/exec'

describe('Publish Symbol Unit Tests', () => {
  let symbolServiceUrl = 'https://testUrl.com'
  let accountName = 'testAdoAccount'
  let patToken = 'patToken'
  let directory = 'C:\\Users\\Directory\\'

  beforeEach(async () => {
    jest.mock('@actions/core')
    jest.spyOn(core, 'debug')
    jest.spyOn(core, 'info')
    jest.spyOn(core, 'error')
    jest.spyOn(core, 'isDebug').mockReturnValue(true)
    // jest.mock('os')
    // jest.spyOn(os, 'type').mockReturnValue("Windows_NT")
  })

  it('downloadSymbolClient successful When file does not exist previously', async () => {
    // Arrange
    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    fs.existsSync.mockReturnValue(false)
    jest.mock('@actions/tool-cache')
    const spy = jest.spyOn(tc, 'downloadTool')
    spy.mockResolvedValue('test.zip')

    // Act
    var symbolPath = await downloadSymbolClient(symbolServiceUrl, directory)

    // Assert
    expect(tc.downloadTool).toHaveBeenCalled()
    expect(symbolPath).toBe('test.zip')
  })

  it('downloadSymbolClient successful When file exists already', async () => {
    // Arrange
    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    fs.existsSync.mockReturnValue(true)
    jest.mock('@actions/io')
    jest.spyOn(io, 'rmRF')
    jest.mock('@actions/tool-cache')
    const spy = jest.spyOn(tc, 'downloadTool')
    spy.mockResolvedValue('test.zip')

    // Act
    var symbolPath = await downloadSymbolClient(symbolServiceUrl, directory)

    // Assert
    expect(tc.downloadTool).toHaveBeenCalled()
    expect(io.rmRF).toHaveBeenCalled()
    expect(symbolPath).toBe('test.zip')
  })

  it('getSymbolClientVersion successful', async () => {
    // Arrange
    jest.mock('axios')
    var axiosSpy = jest.spyOn(axios, 'head')
    var response = {
      headers: {
        'symbol-client-version': '1.0.0'
      }
    }
    axiosSpy.mockResolvedValue(response)

    // Act
    var {versionNumber, downloadUri} = await getSymbolClientVersion(accountName, symbolServiceUrl, patToken)

    // Assert
    expect(axios.head).toHaveBeenCalled()
    expect(versionNumber).toBe('1.0.0')
    expect(downloadUri).toBe('https://testUrl.com/_apis/symbol/client/task')
  })

  it('runSymbolCommand successful', async () => {
    // Arrange
    jest.mock('@actions/exec')
    jest.spyOn(exec, 'exec').mockResolvedValue(0)

    // Act
    await runSymbolCommand('C:\\assemblyPath', 'args')

    // Assert
    expect(exec.exec).toHaveBeenCalled()
  })

  // it('runSymbolCommand throws Error', async () => {
  //   // Arrange
  //   jest.mock('@actions/exec')
  //   const execSpy = jest.spyOn(exec, 'exec')
  //   execSpy.mockResolvedValue(200)

  //   // Act
  //   expect(async () => {
  //     await runSymbolCommand('C:\\assemblyPath', 'args');
  //   }).toThrowError('C:\\assemblyPath\\symbol.exe exited with code 200');

  //   // Assert
  //   expect(exec.exec).toHaveBeenCalled()
  // })

  it('unzipSymbolClient successful - File did not exist earlier', async () => {
    // Arrange
    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    fs.existsSync.mockReturnValue(false)
    jest.mock('@actions/io')
    jest.spyOn(io, 'mkdirP')
    jest.spyOn(tc, 'extractZip')

    // Act
    await unzipSymbolClient('clientZip.zip', 'C:\\destination')

    // Assert
    expect(io.mkdirP).toHaveBeenCalled()
    expect(io.rmRF).not.toHaveBeenCalled()
    expect(tc.extractZip).toHaveBeenCalled()
  })

  it('unzipSymbolClient successful - File exists already', async () => {
    // Arrange
    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    fs.existsSync.mockReturnValue(true)
    jest.mock('@actions/io')
    jest.spyOn(io, 'mkdirP')
    jest.spyOn(io, 'rmRF')
    jest.spyOn(tc, 'extractZip')

    // Act
    await unzipSymbolClient('clientZip.zip', 'C:\\destination')

    // Assert
    expect(io.mkdirP).toHaveBeenCalled()
    expect(io.rmRF).toHaveBeenCalled()
    expect(tc.extractZip).toHaveBeenCalled()
  })

  it('updateSymbolClient successful', async () => {
    // Arrange
    jest.mock('axios')
    var axiosSpy = jest.spyOn(axios, 'head')
    var response = {
      headers: {
        'symbol-client-version': '1.0.0'
      }
    }
    axiosSpy.mockResolvedValue(response)

    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    fs.existsSync.mockReturnValue(false)

    jest.mock('@actions/io')
    jest.spyOn(io, 'rmRF')
    jest.spyOn(io, 'mkdirP')

    jest.mock('@actions/tool-cache')
    const spy = jest.spyOn(tc, 'downloadTool')
    spy.mockResolvedValue('test.zip')
    jest.spyOn(tc, 'extractZip')
    jest.spyOn(tc, 'cacheDir')

    // Act
    var toolPath = await updateSymbolClient(accountName, symbolServiceUrl, patToken)

    // Assert
    expect(toolPath).not.toBe('')
  })

  it('updateSymbolClient successful - Explicit Version from cache', async () => {
    // Arrange
    jest.mock('axios')
    var axiosSpy = jest.spyOn(axios, 'head')
    var response = {
      headers: {
        'symbol-client-version': '1.0.0'
      }
    }
    axiosSpy.mockResolvedValue(response)

    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    fs.existsSync.mockReturnValue(true)

    // Act
    var toolPath = await updateSymbolClient(accountName, symbolServiceUrl, patToken)

    // Assert
    expect(toolPath).not.toBe('')
  })

  it('unpublishSymbols successful', async () => {
    // Act
    unpublishSymbols('share', 'tran-1234')

    // Assert
    expect(core.debug).toHaveBeenCalled()
    expect(core.info).toHaveBeenCalled()
  })

  it('getSymbolServiceUri successful', async () => {
    // Arrange
    jest.mock('axios')
    var axiosSpy = jest.spyOn(axios, 'get')
    var response = {
      status: 200,
      data: {
        locationMappings: [
          {
            location: 'https://artifacts.dev.azure.com'
          }
        ]
      }
    }
    axiosSpy.mockResolvedValue(response)

    // Act
    var artifactUri = await getSymbolServiceUri('https://collection.microsoft.com', 'patToken')

    // Assert
    expect(artifactUri).toBe('https://artifacts.dev.azure.com')
  })

  it('getSymbolServiceUri failure', async () => {
    // Arrange
    jest.mock('axios')
    var axiosSpy = jest.spyOn(axios, 'get')
    var response = {
      status: 500
    }
    axiosSpy.mockResolvedValue(response)

    // Act
    var artifactUri = await getSymbolServiceUri('https://collection.microsoft.com', 'patToken')

    // Assert
    expect(artifactUri).toBe('')
  })

  it('publishSymbols successful', async () => {
    // Arrange
    jest.mock('axios')
    var axiosSpy = jest.spyOn(axios, 'head')
    var response = {
      headers: {
        'symbol-client-version': '1.0.0'
      }
    }
    axiosSpy.mockResolvedValue(response)

    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    fs.existsSync.mockReturnValue(true)

    jest.mock('@actions/exec')
    jest.spyOn(exec, 'exec').mockResolvedValue(0)

    // Act
    await publishSymbols(accountName, symbolServiceUrl, 'GET', 'C:\\Users\\test', 'file.json', '365', 'patToken')

    // Assert
    expect(core.error).not.toHaveBeenCalled()
  })

  it('publishSymbols successful - sourcePathListFileName Not Provided', async () => {
    // Arrange
    jest.mock('axios')
    var axiosSpy = jest.spyOn(axios, 'head')
    var response = {
      headers: {
        'symbol-client-version': '1.0.0'
      }
    }
    axiosSpy.mockResolvedValue(response)

    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    fs.existsSync.mockReturnValue(true)

    jest.mock('@actions/exec')
    jest.spyOn(exec, 'exec').mockResolvedValue(0)

    // Act
    await publishSymbols(accountName, symbolServiceUrl, 'GET', 'C:\\Users\\test', '', '365', 'patToken')

    // Assert
    expect(core.error).not.toHaveBeenCalled()
  })

  // it('publishSymbols unsuccessful - sourcePathListFileName Absent', async () => {
  //     // Arrange
  //     jest.mock('axios');
  //     var axiosSpy = jest.spyOn(axios, 'head');
  //     var response = {
  //         headers: {
  //             'symbol-client-version': '1.0.0'
  //         }
  //     };
  //     axiosSpy.mockResolvedValue(response);

  //     jest.mock('fs');
  //     jest.spyOn(fs, 'existsSync');
  //     fs.existsSync.mockReturnValue(false);

  //     jest.mock('@actions/io');
  //     jest.spyOn(io, 'rmRF');
  //     jest.spyOn(io, 'mkdirP');

  //     jest.mock('@actions/tool-cache');
  //     const spy = jest.spyOn(tc, 'downloadTool');
  //     spy.mockResolvedValue("test.zip");
  //     jest.spyOn(tc, 'extractZip');
  //     jest.spyOn(tc, 'cacheDir');

  //     jest.mock('@actions/exec');
  //     jest.spyOn(exec, 'exec').mockResolvedValue(0);

  //     // Act
  //     await publishSymbols(symbolServiceUrl, 'GET', 'C:\\Users\\test', 'file.json', '365', 'patToken');

  //     // Assert
  //     expect(core.error).toHaveBeenCalled();
  // });

  it('publishSymbols successful - sourcePath Ends with \\', async () => {
    // Arrange
    jest.mock('axios')
    var axiosSpy = jest.spyOn(axios, 'head')
    var response = {
      headers: {
        'symbol-client-version': '1.0.0'
      }
    }
    axiosSpy.mockResolvedValue(response)

    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    fs.existsSync.mockReturnValue(true)

    jest.mock('@actions/exec')
    jest.spyOn(exec, 'exec').mockResolvedValue(0)

    // Act
    await publishSymbols(accountName, symbolServiceUrl, 'GET', 'C:\\Users\\test\\', 'file.json', '365', 'patToken')

    // Assert
    expect(core.error).not.toHaveBeenCalled()
  })

  it('publishSymbols successful - Expiration in Days is absent', async () => {
    // Arrange
    jest.mock('axios')
    var axiosSpy = jest.spyOn(axios, 'head')
    var response = {
      headers: {
        'symbol-client-version': '1.0.0'
      }
    }
    axiosSpy.mockResolvedValue(response)

    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    fs.existsSync.mockReturnValue(true)

    jest.mock('@actions/exec')
    jest.spyOn(exec, 'exec').mockResolvedValue(0)

    // Act
    await publishSymbols(accountName, symbolServiceUrl, 'GET', 'C:\\Users\\test', 'file.json', '', 'patToken')

    // Assert
    expect(core.error).not.toHaveBeenCalled()
  })

  it('find error - toolName Not present', async () => {
    expect(() => {
      find('', '1.0.0')
    }).toThrowError('toolName parameter is required')
  })

  it('find error - versionSpec Not present', async () => {
    expect(() => {
      find('tool2', '')
    }).toThrowError('versionSpec is a required parameter')
  })

  it('find error - not explicit version', () => {
    // Arrange
    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    jest.spyOn(fs, 'readdirSync')
    fs.existsSync.mockReturnValue(true)
    fs.readdirSync.mockReturnValue(['1.0.0', '3.0.0', '2.0.0'])

    // Act
    var toolName = find('tool2', 'testVersion-2', 'x86')

    // Assert
    expect(toolName).toBe('')
  })
})

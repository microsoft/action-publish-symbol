import * as core from '@actions/core'
import {getInputWithDefault, getTempFileName, parseBoolean} from '../src/Helpers'
const fs = require('fs')

describe('Helper Unit Tests', () => {
  beforeEach(async () => {
    jest.mock('@actions/core')
    jest.spyOn(core, 'debug')
    jest.spyOn(core, 'info')
    jest.spyOn(core, 'error')
  })

  it('getTempFileName successful - Generate Temp file', () => {
    // Arrange
    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    fs.existsSync.mockReturnValueOnce(true).mockReturnValue(false)

    // Act
    getTempFileName()

    // Assert
    expect(core.error).not.toHaveBeenCalled()
  })

  it('getTempFileName successful - Exists even after 5 attempts', () => {
    // Arrange
    jest.mock('fs')
    jest.spyOn(fs, 'existsSync')
    fs.existsSync.mockReturnValue(true)

    // Act
    expect(() => {
      getTempFileName()
    }).toThrowError('Unable to create unique temp file name after 6 attempts')

    // Assert
    expect(core.error).toHaveBeenCalled()
  })

  it('parseBoolean returns true for string true', () => {
    var out = parseBoolean('true')

    expect(out).toBe(true)
  })

  it('parseBoolean returns true for int 1', () => {
    var out = parseBoolean('1')

    expect(out).toBe(true)
  })

  it('parseBoolean returns false for string false', () => {
    var out = parseBoolean('false')

    expect(out).toBe(false)
  })

  it('parseBoolean returns false for int 0', () => {
    var out = parseBoolean('0')

    expect(out).toBe(false)
  })

  it('getInputWithDefault returns provided input', () => {
    // Arrange
    jest.spyOn(core, 'getInput').mockReturnValue('sampleInput')

    // Act
    var out = getInputWithDefault('input', 'defaultValue')

    // Assert
    expect(out).toBe('sampleInput')
  })

  it('getInputWithDefault returns default as no input provided', () => {
    // Arrange
    jest.spyOn(core, 'getInput').mockReturnValue('')

    // Act
    var out = getInputWithDefault('input', 'defaultValue')

    // Assert
    expect(out).toBe('defaultValue')
  })
})

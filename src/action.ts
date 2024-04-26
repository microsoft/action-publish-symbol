import * as core from '@actions/core'
import fs from 'fs'
import * as glob from '@actions/glob'
import {Guid} from 'guid-typescript'
import * as hlp from './helpers'
import * as ps from './publishSymbols'
import * as path from 'path'
import * as io from '@actions/io'

export async function run(): Promise<void> {
  try {
    // Get workflow inputs
    const accountName = core.getInput('accountName', {required: true})
    const symbolServerUrl = `${core.getInput('symbolServiceUrl')}/${accountName}`
    const symbolsFolder: string = hlp.getInputWithDefault('SymbolsFolder', process.env['RUNNER_WORKSPACE'] as string)
    const searchPattern: string = hlp.getInputWithDefault('SearchPattern', '**\\bin\\**\\*.pdb')

    // Get env vars
    const githubRepository = process.env['GITHUB_REPOSITORY']
    const githubWorkflow = process.env['GITHUB_WORKFLOW']
    const githubRunNumber = process.env['GITHUB_RUN_NUMBER']
    const githubRunId = process.env['GITHUB_RUN_ID']

    const requestName = `${githubRepository}/${githubWorkflow}/${githubRunNumber}/${githubRunId}/${Guid.create().toString()}`.toLowerCase()

    core.info(`Symbol Request Name = ${requestName}`)

    const personalAccessToken = core.getInput('personalAccessToken', {required: true})

    // flag the PAT as a secret so it's not written to logs
    core.setSecret(personalAccessToken)

    if (!fs.existsSync(symbolsFolder)) {
      throw Error(`The folder '${symbolsFolder}' does not exist, please provide a valid folder`)
    }

    // Find all of the matches for the glob pattern(s)
    const fileList: string[] = []

    const searchPatterns = searchPattern
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)
    for (var pattern of searchPatterns) {
      const globber = await glob.create(path.join(symbolsFolder, pattern))
      const matches = await globber.glob()

      // Return all the files that aren't directories
      let matchedFiles: string[] = matches.filter((res: string) => fs.statSync(res).isFile())
      fileList.push(...matchedFiles)
    }

    core.info(`Found ${fileList.length} files`)

    if (fileList.length === 0) {
      core.error(`No files present in match list, the match had ${fileList.length} matches`)
    }

    const tmpFileName = hlp.getTempFileName()

    const stream = fs.createWriteStream(tmpFileName, {flags: 'a'})

    for (const fileName of fileList) {
      stream.write(`${fileName}\n`)
    }

    stream.end()

    await ps.publishSymbols(
      accountName,
      symbolServerUrl,
      requestName,
      symbolsFolder,
      tmpFileName,
      '36530',
      personalAccessToken
    )

    if (fs.existsSync(tmpFileName)) {
      io.rmRF(tmpFileName)
    }
  } catch (error) {
    core.setFailed(`Action failed with error ${error}`)
  }
}

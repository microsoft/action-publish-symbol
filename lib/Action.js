"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const core = __importStar(require("@actions/core"));
const fs_1 = __importDefault(require("fs"));
const glob = __importStar(require("@actions/glob"));
const guid_typescript_1 = require("guid-typescript");
const hlp = __importStar(require("./helpers"));
const ps = __importStar(require("./publishSymbols"));
const path = __importStar(require("path"));
const io = __importStar(require("@actions/io"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get workflow inputs
            const accountName = core.getInput('accountName', { required: true });
            const symbolServerUrl = `${core.getInput('symbolServiceUrl')}/${accountName}`;
            const symbolsFolder = hlp.getInputWithDefault('SymbolsFolder', process.env['RUNNER_WORKSPACE']);
            const searchPattern = hlp.getInputWithDefault('SearchPattern', '**\\bin\\**\\*.pdb');
            // Get env vars
            const githubRepository = process.env['GITHUB_REPOSITORY'];
            const githubWorkflow = process.env['GITHUB_WORKFLOW'];
            const githubRunNumber = process.env['GITHUB_RUN_NUMBER'];
            const githubRunId = process.env['GITHUB_RUN_ID'];
            const requestName = `${githubRepository}/${githubWorkflow}/${githubRunNumber}/${githubRunId}/${guid_typescript_1.Guid.create().toString()}`.toLowerCase();
            core.info(`Symbol Request Name = ${requestName}`);
            const personalAccessToken = core.getInput('personalAccessToken', { required: true });
            // flag the PAT as a secret so it's not written to logs
            core.setSecret(personalAccessToken);
            if (!fs_1.default.existsSync(symbolsFolder)) {
                throw Error(`The folder '${symbolsFolder}' does not exist, please provide a valid folder`);
            }
            // Find all of the matches for the glob pattern(s)
            const fileList = [];
            const searchPatterns = searchPattern
                .split('\n')
                .map(p => p.trim())
                .filter(p => p.length > 0);
            for (var pattern of searchPatterns) {
                const globber = yield glob.create(path.join(symbolsFolder, pattern));
                const matches = yield globber.glob();
                // Return all the files that aren't directories
                let matchedFiles = matches.filter((res) => fs_1.default.statSync(res).isFile());
                fileList.push(...matchedFiles);
            }
            core.info(`Found ${fileList.length} files`);
            if (fileList.length === 0) {
                core.error(`No files present in match list, the match had ${fileList.length} matches`);
            }
            const tmpFileName = hlp.getTempFileName();
            const stream = fs_1.default.createWriteStream(tmpFileName, { flags: 'a' });
            for (const fileName of fileList) {
                stream.write(`${fileName}\n`);
            }
            stream.end();
            yield ps.publishSymbols(accountName, symbolServerUrl, requestName, symbolsFolder, tmpFileName, '36530', personalAccessToken);
            if (fs_1.default.existsSync(tmpFileName)) {
                io.rmRF(tmpFileName);
            }
        }
        catch (error) {
            core.setFailed(`Action failed with error ${error}`);
        }
    });
}
exports.run = run;

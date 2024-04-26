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
exports.findAllVersions = exports.find = exports.getSymbolServiceUri = exports.unpublishSymbols = exports.publishSymbols = exports.updateSymbolClient = exports.unzipSymbolClient = exports.runSymbolCommand = exports.getSymbolClientVersion = exports.downloadSymbolClient = void 0;
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const exec = __importStar(require("@actions/exec"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const hlp = __importStar(require("./Helpers"));
const fs_1 = __importDefault(require("fs"));
const io = __importStar(require("@actions/io"));
const os = __importStar(require("os"));
const assert_1 = require("assert");
const semver = __importStar(require("semver"));
var isWindows = os.type() == 'Windows_NT';
function downloadSymbolClient(downloadUri, directory) {
    return __awaiter(this, void 0, void 0, function* () {
        const symbolAppZip = path_1.default.join(directory, 'symbol.app.buildtask.zip');
        core.debug(`Downloading ${downloadUri} to ${symbolAppZip}`);
        if (fs_1.default.existsSync(symbolAppZip)) {
            core.debug(`Deleting file found at ${symbolAppZip}`);
            yield io.rmRF(symbolAppZip);
        }
        const symbolPath = yield tc.downloadTool(downloadUri, symbolAppZip);
        core.debug('Download complete');
        return symbolPath;
    });
}
exports.downloadSymbolClient = downloadSymbolClient;
function getSymbolClientVersion(accountName, symbolServiceUri, personalAccessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug('Getting latest symbol.app.buildtask.zip package');
        if (!isWindows) {
            var clientFetchUrl = `https://vsblob.dev.azure.com/${accountName}/_apis/clienttools/symbol/release?osName=linux&arch=x86_64`;
            const encodedBase64Token = Buffer.from(`${''}:${personalAccessToken}`).toString('base64');
            const response = yield axios_1.default.get(clientFetchUrl, {
                headers: {
                    Authorization: `Basic ${encodedBase64Token}`
                }
            });
            if (response.status == 401) {
                throw Error("Verify that PAT isn't expired and has build scope permission");
            }
            else if (response.status >= 300) {
                throw Error("Client download URL couldn't be retrieved");
            }
            const versionNumber = response.data.version;
            const downloadUri = response.data.uri;
            core.debug(`Most recent version is ${versionNumber}`);
            return { versionNumber, downloadUri };
        }
        else {
            var clientFetchUrl = `${symbolServiceUri}/_apis/symbol/client/`;
            const response = yield axios_1.default.head(clientFetchUrl);
            const versionNumber = response.headers['symbol-client-version'];
            const downloadUri = `${symbolServiceUri}/_apis/symbol/client/task`;
            core.debug(`Most recent version is ${versionNumber}`);
            return { versionNumber, downloadUri };
        }
    });
}
exports.getSymbolClientVersion = getSymbolClientVersion;
function runSymbolCommand(assemblyPath, args) {
    return __awaiter(this, void 0, void 0, function* () {
        var exe;
        if (isWindows) {
            exe = path_1.default.join(assemblyPath, 'symbol.exe');
        }
        else {
            exe = path_1.default.join(assemblyPath, 'symbol');
            yield exec.exec(`chmod 755 ${exe}`); // Set the symbol command executable by giving appropriate permission
        }
        const traceLevel = core.isDebug() ? 'verbose' : 'info';
        const finalArgs = `${args} --tracelevel ${traceLevel} --globalretrycount 2`;
        core.info(`Executing: ${exe} ${finalArgs}`);
        const result = yield exec.exec(`${exe} ${finalArgs}`);
        if (result !== 0) {
            throw Error(`${exe} exited with code ${result}`);
        }
    });
}
exports.runSymbolCommand = runSymbolCommand;
function unzipSymbolClient(clientZip, destinationDirectory) {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug(`Unzipping ${clientZip}`);
        if (fs_1.default.existsSync(destinationDirectory)) {
            core.debug(`Deleting folder found at ${destinationDirectory}`);
            yield io.rmRF(destinationDirectory);
        }
        core.debug(`Creating ${destinationDirectory}`);
        yield io.mkdirP(destinationDirectory);
        var result = '';
        if (isWindows) {
            result = yield tc.extractZip(clientZip, destinationDirectory);
        }
        else {
            try {
                yield exec.exec(`/usr/bin/unzip -o -q ${clientZip} -d ${destinationDirectory}`);
                result = destinationDirectory;
            }
            catch (e) {
                core.warning('Encountered some issues while unzipping.');
            }
        }
        core.debug(`Unzipped - ${result}`);
    });
}
exports.unzipSymbolClient = unzipSymbolClient;
function updateSymbolClient(accountName, symbolServiceUri, personalAccessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug('Checking for most recent symbol.app.buildtask.zip version');
        const { versionNumber, downloadUri } = yield getSymbolClientVersion(accountName, symbolServiceUri, personalAccessToken);
        const toolName = 'SymbolClient';
        const zipName = 'symbol.app.buildtask';
        // Look up the tool path to see if it's been cached already
        // Note: SymbolClient does not use strict semver, so we have to use our own copy of the find() function
        let toolPath = find(toolName, versionNumber, 'x64');
        // If not tool was found in the cache for the latest version, download and cache it
        if (toolPath === '') {
            core.debug(`Tool: ${toolName}, version: ${versionNumber} not found, downloading...`);
            const baseDownloadPath = path_1.default.join(hlp.getTempPath(), toolName, versionNumber);
            // If a previous download exists, clean it up before downloading again
            if (fs_1.default.existsSync(baseDownloadPath)) {
                core.debug(`Cleaning ${baseDownloadPath}`);
                yield io.rmRF(baseDownloadPath);
            }
            core.debug(`Creating ${baseDownloadPath}`);
            yield io.mkdirP(baseDownloadPath);
            const symbolClientZip = yield downloadSymbolClient(downloadUri, baseDownloadPath);
            const unzipPath = path_1.default.join(baseDownloadPath, zipName);
            yield unzipSymbolClient(symbolClientZip, unzipPath);
            // Cache the tool for future use
            toolPath = yield tc.cacheDir(unzipPath, toolName, versionNumber);
            core.debug(`Cached tool ${toolName}, version: ${versionNumber} at '${toolPath}'`);
        }
        else {
            core.debug(`Cached tool ${toolName}, version: ${versionNumber} found at '${toolPath}`);
        }
        // add on the lib\net45 path to the actual executable
        toolPath = isWindows ? path_1.default.join(toolPath, 'lib', 'net45') : toolPath;
        return toolPath;
    });
}
exports.updateSymbolClient = updateSymbolClient;
function publishSymbols(accountName, symbolServiceUri, requestName, sourcePath, sourcePathListFileName, expirationInDays, personalAccessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug(`Using endpoint ${symbolServiceUri} to create request ${requestName} with content in ${sourcePath}`);
        // the latest symbol.app.buildtask.zip and use the assemblies in it.
        const assemblyPath = yield updateSymbolClient(accountName, symbolServiceUri, personalAccessToken);
        // Publish the files
        try {
            // if the last char in the source path is \, remove it
            if (sourcePath.endsWith('\\')) {
                sourcePath = sourcePath.substr(0, sourcePath.length - 1);
                core.debug(`Removed trailing '\\' in sourcePath. New value: ${sourcePath}`);
            }
            let args = `publish --service "${symbolServiceUri}" --name "${requestName}" --directory "${sourcePath}"`;
            if (expirationInDays) {
                args += ` --expirationInDays "${expirationInDays}"`;
            }
            core.exportVariable('SYMBOL_PAT_AUTH_TOKEN', personalAccessToken);
            args += ` --patAuthEnvVar SYMBOL_PAT_AUTH_TOKEN`;
            if (sourcePathListFileName) {
                if (!fs_1.default.existsSync(sourcePathListFileName)) {
                    core.warning(`File ${sourcePathListFileName} not found}`);
                }
                else {
                    args += ` --fileListFileName "${sourcePathListFileName}"`;
                }
            }
            yield runSymbolCommand(assemblyPath, args);
        }
        catch (err) {
            core.error(`Error ${err}`);
            throw err;
        }
    });
}
exports.publishSymbols = publishSymbols;
function unpublishSymbols(Share, TransactionId) {
    const symstoreArgs = `del /i "${TransactionId} /s "${Share}"`;
    core.debug(symstoreArgs);
    core.info(`Executing symstore.exe ${symstoreArgs}`);
}
exports.unpublishSymbols = unpublishSymbols;
function getSymbolServiceUri(collectionUri, personalAccessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const serviceDefinitionUri = `${collectionUri}/_apis/servicedefinitions/locationservice2/951917ac-a960-4999-8464-e3f0aa25b381`;
        let artifactsUri = '';
        const auth = { auth: { username: '', password: personalAccessToken } };
        let response = yield axios_1.default.get(serviceDefinitionUri, auth);
        if (response.status === 200) {
            const locationUri = response.data.locationMappings[0].location;
            if (!locationUri) {
                throw Error(`No location mappings found while querying ${serviceDefinitionUri}`);
            }
            const locationServiceUri = `${locationUri}/_apis/servicedefinitions/locationservice2/00000016-0000-8888-8000-000000000000`;
            response = yield axios_1.default.get(locationServiceUri, auth);
            if (response.status !== 200) {
                throw Error(`Failure while querying '${locationServiceUri}', returned (${response.status} - ${response.statusText})`);
            }
            artifactsUri = response.data.locationMappings[0].location;
            if (!artifactsUri) {
                core.error(`No location mappings found while querying ${artifactsUri}`);
            }
            core.info(`Retrieved artifact service url: '${artifactsUri}'`);
        }
        else {
            core.error(`Symbol server not found at ${collectionUri}`);
        }
        return artifactsUri;
    });
}
exports.getSymbolServiceUri = getSymbolServiceUri;
/**
 * Finds the path to a tool version in the local installed tool cache
 *
 * @param toolName      name of the tool
 * @param versionSpec   version of the tool
 * @param arch          optional arch.  defaults to arch of computer
 */
function find(toolName, versionSpec, arch) {
    if (!toolName) {
        throw new Error('toolName parameter is required');
    }
    if (!versionSpec) {
        throw new Error('versionSpec is a required parameter');
    }
    arch = arch || os.arch();
    // attempt to resolve an explicit version
    if (!_isExplicitVersion(versionSpec)) {
        const localVersions = findAllVersions(toolName, arch);
        const match = _evaluateVersions(localVersions, versionSpec);
        versionSpec = match;
    }
    // check for the explicit version in the cache
    let toolPath = '';
    if (versionSpec) {
        const cachePath = path_1.default.join(_getCacheDirectory(), toolName, versionSpec, arch);
        core.debug(`checking cache: ${cachePath}`);
        if (fs_1.default.existsSync(cachePath) && fs_1.default.existsSync(`${cachePath}.complete`)) {
            core.debug(`Found tool in cache ${toolName} ${versionSpec} ${arch}`);
            toolPath = cachePath;
        }
        else {
            core.debug('not found');
        }
    }
    return toolPath;
}
exports.find = find;
/**
 * Finds the paths to all versions of a tool that are installed in the local tool cache
 *
 * @param toolName  name of the tool
 * @param arch      optional arch.  defaults to arch of computer
 */
function findAllVersions(toolName, arch) {
    const versions = [];
    arch = arch || os.arch();
    const toolPath = path_1.default.join(_getCacheDirectory(), toolName);
    if (fs_1.default.existsSync(toolPath)) {
        const children = fs_1.default.readdirSync(toolPath);
        for (const child of children) {
            if (_isExplicitVersion(child)) {
                const fullPath = path_1.default.join(toolPath, child, arch || '');
                if (fs_1.default.existsSync(fullPath) && fs_1.default.existsSync(`${fullPath}.complete`)) {
                    versions.push(child);
                }
            }
        }
    }
    return versions;
}
exports.findAllVersions = findAllVersions;
/**
 * Finds the paths to all versions of a tool that are installed in the local tool cache
 *
 * @param versions      a list of versions to evaluate
 * @param versionSpec   version of the tool
 */
function _evaluateVersions(versions, versionSpec) {
    let version = '';
    core.debug(`evaluating ${versions.length} versions`);
    versions = versions.sort((a, b) => {
        if (semver.gt(a, b)) {
            return 1;
        }
        return -1;
    });
    for (let i = versions.length - 1; i >= 0; i--) {
        const potential = versions[i];
        const satisfied = semver.satisfies(potential, versionSpec);
        if (satisfied) {
            version = potential;
            break;
        }
    }
    if (version) {
        core.debug(`matched: ${version}`);
    }
    else {
        core.debug('match not found');
    }
    return version;
}
/**
 * Gets RUNNER_TOOL_CACHE
 */
function _getCacheDirectory() {
    const cacheDirectory = process.env['RUNNER_TOOL_CACHE'] || '';
    (0, assert_1.ok)(cacheDirectory, 'Expected RUNNER_TOOL_CACHE to be defined');
    return cacheDirectory;
}
function _isExplicitVersion(versionSpec) {
    const c = semver.clean(versionSpec, { loose: true }) || '';
    core.debug(`isExplicit: ${c}`);
    const valid = semver.valid(c) != null;
    core.debug(`explicit? ${valid}`);
    return valid;
}

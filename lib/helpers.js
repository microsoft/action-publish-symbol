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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvVar = exports.getInputWithDefault = exports.parseBoolean = exports.makeid = exports.getTempFileName = exports.getTempPath = void 0;
const path_1 = __importDefault(require("path"));
const core = __importStar(require("@actions/core"));
const fs_1 = __importDefault(require("fs"));
function getTempPath() {
    const tempFolder = process.env['RUNNER_TEMP'];
    return tempFolder;
}
exports.getTempPath = getTempPath;
function getTempFileName() {
    const suffix = '.txt';
    let tempFileName = path_1.default.join(getTempPath(), `tmp${makeid(6)}${suffix}`);
    let fileExists = fs_1.default.existsSync(tempFileName);
    // We don't want this to run forever.  If the retry loop runs more than 5 times, fail
    let retryCount = 1;
    // If for some reason the file already exists, generate a new one.
    while (fileExists && retryCount < 5) {
        core.debug(`File ${tempFileName} already exists, recreating a new file`);
        tempFileName = path_1.default.join(getTempPath(), `tmp${makeid(6)}${suffix}`);
        fileExists = fs_1.default.existsSync(tempFileName);
        retryCount++;
    }
    // If we get to this point, and the file still exists, throw an exception
    if (fileExists) {
        const errorMessage = `Unable to create unique temp file name after ${retryCount + 1} attempts`;
        core.error(errorMessage);
        throw Error(errorMessage);
    }
    return tempFileName;
}
exports.getTempFileName = getTempFileName;
function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
exports.makeid = makeid;
function parseBoolean(input) {
    return input.toLowerCase() === 'true' || input.toLowerCase() === '1' ? true : false;
}
exports.parseBoolean = parseBoolean;
function getInputWithDefault(inputName, defaultValue) {
    const inputValue = core.getInput(inputName);
    return inputValue.trim().length !== 0 ? inputValue : defaultValue;
}
exports.getInputWithDefault = getInputWithDefault;
function getEnvVar(envVar) {
    return process.env[envVar];
}
exports.getEnvVar = getEnvVar;

"use strict";
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
const path_1 = require("path");
const crypto_1 = require("crypto");
const bash_1 = __importDefault(require("../utils/bash"));
exports.default = (dir) => __awaiter(void 0, void 0, void 0, function* () {
    const path = path_1.resolve(dir);
    const remote_raw = yield bash_1.default('git', { cwd: path }, 'remote', '-v');
    const branch_raw = yield bash_1.default('git', { cwd: path }, 'rev-parse', '--abbrev-ref', 'HEAD');
    if (remote_raw[1] === 1)
        throw new Error(`Failed to get remote for ${path_1.relative(process.cwd(), path)}`);
    if (branch_raw[1] === 1)
        throw new Error(`Failed to get branch for ${path_1.relative(process.cwd(), path)}`);
    const remote = remote_raw[0].split(/[\r\n]+/)[0].split(/[\s\t]+/)[1].trim();
    const url = remote.replace(/\.git/, '/src/master').replace(/:/, '/').replace(/git@/, 'https://');
    const branch = branch_raw[0].trim();
    const partial_module = {
        path,
        remote,
        branch,
        url
    };
    return Object.assign({ id: crypto_1.createHash('md5').update(JSON.stringify(partial_module)).digest('hex') }, partial_module);
});
//# sourceMappingURL=index-repo.js.map
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
const context_1 = __importDefault(require("../utils/context"));
const utils_1 = require("../utils");
const chalk_1 = require("chalk");
const lodash_1 = require("lodash");
const parse_change = (status, code, ...change) => {
    switch (code) {
        case 'M':
            status.modified = [...(status.modified || []), change.join(' ')];
            break;
        case 'A':
            status.added = [...(status.added || []), change.join(' ')];
            break;
        case 'D':
            status.deleted = [...(status.deleted || []), change.join(' ')];
            break;
        case 'R':
            status.renamed = [...(status.renamed || []), [change[0], change[2]]];
            break;
        case 'C':
            status.copied = [...(status.copied || []), change.join(' ')];
            break;
        case 'U':
            status.unmerged = [...(status.unmerged || []), change.join(' ')];
            break;
    }
};
const parse_status_line = (status, line) => {
    var _a, _b;
    const line_status_raw = line.substring(0, 2);
    const parts = line.substring(3, line.length).split(' ');
    if (line_status_raw === '??') {
        status.untracked = [...(status.untracked || []), parts.join(' ')];
        return status;
    }
    else if (line_status_raw === '##') {
        const rest = parts.join(' ');
        status.head.upstream = rest.includes('...');
        if (rest.includes('[')) {
            status.head.ahead = Number((((_a = /ahead (?<ahead>\d+)/.exec(rest)) === null || _a === void 0 ? void 0 : _a.groups) || { ahead: '0' })['ahead']);
            status.head.behind = Number((((_b = /behind (?<behind>\d+)/.exec(rest)) === null || _b === void 0 ? void 0 : _b.groups) || { behind: '0' })['behind']);
        }
        return status;
    }
    const line_status = line_status_raw.split('') || [];
    parse_change(status.staged, line_status[0], ...parts);
    parse_change(status.unstaged, line_status[1], ...parts);
    return status;
};
const parse_status = (raw) => {
    const lines = raw.split('\n');
    return lines.reduce(parse_status_line, {
        staged: {},
        unstaged: {},
        untracked: [],
        head: {
            ahead: 0,
            behind: 0,
            upstream: false,
        }
    });
};
const print_status = (status) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const lines = [];
    lines.push(...(((_a = status.staged.modified) === null || _a === void 0 ? void 0 : _a.map(file => chalk_1.green(` M ${file}`))) || []));
    lines.push(...(((_b = status.staged.added) === null || _b === void 0 ? void 0 : _b.map(file => chalk_1.green(` A ${file}`))) || []));
    lines.push(...(((_c = status.staged.deleted) === null || _c === void 0 ? void 0 : _c.map(file => chalk_1.green(` D ${file}`))) || []));
    lines.push(...(((_d = status.staged.renamed) === null || _d === void 0 ? void 0 : _d.map(file => chalk_1.green(` R ${file}`))) || []));
    lines.push(...(((_e = status.staged.copied) === null || _e === void 0 ? void 0 : _e.map(file => chalk_1.green(` C ${file}`))) || []));
    lines.push(...(((_f = status.staged.unmerged) === null || _f === void 0 ? void 0 : _f.map(file => chalk_1.green(` U ${file}`))) || []));
    lines.push(...(((_g = status.unstaged.modified) === null || _g === void 0 ? void 0 : _g.map(file => chalk_1.red(` M ${file}`))) || []));
    lines.push(...(((_h = status.unstaged.deleted) === null || _h === void 0 ? void 0 : _h.map(file => chalk_1.red(` D ${file}`))) || []));
    lines.push(...(((_j = status.unstaged.renamed) === null || _j === void 0 ? void 0 : _j.map(file => chalk_1.red(` R ${file}`))) || []));
    lines.push(...(((_k = status.unstaged.copied) === null || _k === void 0 ? void 0 : _k.map(file => chalk_1.red(` C ${file}`))) || []));
    lines.push(...(((_l = status.unstaged.unmerged) === null || _l === void 0 ? void 0 : _l.map(file => chalk_1.red(` U ${file}`))) || []));
    lines.push(...(((_m = status.untracked) === null || _m === void 0 ? void 0 : _m.map(file => chalk_1.red(` ? ${file}`))) || []));
    return lines.join('\n').concat('\n');
};
const print_branch_status = (mod) => {
    const branch = mod.status.head.upstream
        && mod.status.head.ahead === 0
        && mod.status.head.behind === 0
        ? `origin/${mod.branch}`
        : mod.branch;
    const remote_status = mod.status.head.ahead || mod.status.head.behind
        ? ' | '.concat([
            mod.status.head.ahead > 0 && `${mod.status.head.ahead} ahead`,
            mod.status.head.behind > 0 && `${mod.status.head.behind} behind`
        ].filter(s => s !== false).join(' and ').concat(` of origin/${mod.branch}`))
        : '';
    const color = mod.status.head.ahead + mod.status.head.behind > 0 ? chalk_1.yellowBright : chalk_1.cyanBright;
    return color(`[${branch}${remote_status}]`);
};
const has_changes = (status) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    return [
        Boolean((_a = status.untracked) === null || _a === void 0 ? void 0 : _a.length),
        Boolean((_b = status.staged.modified) === null || _b === void 0 ? void 0 : _b.length),
        Boolean((_c = status.staged.added) === null || _c === void 0 ? void 0 : _c.length),
        Boolean((_d = status.staged.deleted) === null || _d === void 0 ? void 0 : _d.length),
        Boolean((_e = status.staged.renamed) === null || _e === void 0 ? void 0 : _e.length),
        Boolean((_f = status.staged.copied) === null || _f === void 0 ? void 0 : _f.length),
        Boolean((_g = status.staged.unmerged) === null || _g === void 0 ? void 0 : _g.length),
        Boolean((_h = status.unstaged.modified) === null || _h === void 0 ? void 0 : _h.length),
        Boolean((_j = status.unstaged.deleted) === null || _j === void 0 ? void 0 : _j.length),
        Boolean((_k = status.unstaged.renamed) === null || _k === void 0 ? void 0 : _k.length),
        Boolean((_l = status.unstaged.copied) === null || _l === void 0 ? void 0 : _l.length),
        Boolean((_m = status.unstaged.unmerged) === null || _m === void 0 ? void 0 : _m.length),
    ].some(v => v);
};
exports.default = () => __awaiter(void 0, void 0, void 0, function* () {
    const statuses = yield Promise.all(context_1.default.dot.modules.map((mod) => __awaiter(void 0, void 0, void 0, function* () {
        return (Object.assign(Object.assign({}, mod), { status: parse_status((yield utils_1.bash('git', { cwd: mod.path }, 'status', '--porcelain', '-b'))[0]) }));
    })));
    console.log(statuses.map(mod => {
        const color = has_changes(mod.status) ? chalk_1.yellowBright : chalk_1.cyanBright;
        return [
            color(`./${path_1.relative(process.cwd(), mod.path)} ${print_branch_status(mod)}`),
            has_changes(mod.status) && print_status(mod.status)
        ].filter(s => !lodash_1.isEmpty(s)).join('\n');
    }).join('\n'));
});
//# sourceMappingURL=status.js.map
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
const fs_1 = require("fs");
const path_1 = require("path");
const chalk_1 = require("chalk");
const index_fs_1 = __importDefault(require("./index-fs"));
const index_repo_1 = __importDefault(require("./index-repo"));
const ngm_dir = '.ngm';
const map_file = '.ngm-map.json';
const mkdir = (path, ...sub_dir) => {
    return (new Promise((res, rej) => fs_1.mkdir(path_1.resolve(path, ...sub_dir), err => {
        if (err)
            return rej(err);
        res(true);
    })));
};
const write = (file, text) => {
    return (new Promise((res, rej) => {
        fs_1.writeFile(path_1.resolve(file), text, err => {
            if (err)
                return rej(err);
            res(true);
        });
    }));
};
const create_dot_folder = (dir) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(chalk_1.yellow('  Indexing...'));
    yield mkdir(dir, `./${ngm_dir}`);
    const folders = yield index_fs_1.default(dir);
    const modules = yield Promise.all(folders.map(folder => index_repo_1.default(folder)));
    const ngm_dot = {
        modules,
        module_map: modules.reduce((acc, mod) => (Object.assign(Object.assign({}, acc), { [mod.id]: mod })), {}),
        projects: [],
        project_map: {}
    };
    yield write(path_1.resolve(dir, `./${ngm_dir}`, map_file), JSON.stringify(ngm_dot, null, 2));
    return ngm_dot;
});
exports.default = (dir) => __awaiter(void 0, void 0, void 0, function* () {
    return (new Promise((res, rej) => {
        fs_1.access(path_1.resolve(dir, `./${ngm_dir}`), (err) => {
            if (err) {
                if (err.code === 'ENOENT')
                    return create_dot_folder(path_1.resolve(dir)).then(res);
                return rej(err);
            }
            fs_1.readFile(path_1.resolve(dir, `./${ngm_dir}`, map_file), (err, data) => {
                if (err)
                    return rej(err);
                res(JSON.parse(`${data}`));
            });
        });
    }));
});
//# sourceMappingURL=read-dot.js.map
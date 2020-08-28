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
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const index_fs = (dir, ...sub_dir) => {
    return (new Promise((res, rej) => {
        const path = path_1.resolve(dir, ...sub_dir);
        fs_1.readdir(path, { withFileTypes: true }, (err, dirents) => __awaiter(void 0, void 0, void 0, function* () {
            if (err)
                return rej(err);
            let folders = dirents.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
            const is_repo = folders.includes('.git');
            folders = folders.filter(v => !v.startsWith('.'));
            const sub_repos = (yield Promise.all(folders.map((folder) => index_fs(path, folder)))).reduce((acc, folders) => ([...acc, ...folders]), []);
            if (is_repo)
                res([path, ...sub_repos]);
            else
                res(sub_repos);
        }));
    }));
};
exports.default = index_fs;
//# sourceMappingURL=index-fs.js.map
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
const child_process_1 = require("child_process");
const lodash_1 = require("lodash");
const bash = (command, ...params) => __awaiter(void 0, void 0, void 0, function* () {
    let opt = {};
    if (!params)
        params = [];
    if (params.length > 0 && typeof params[0] === 'object')
        opt = params.shift();
    const cli_params = params.filter(v => typeof v === 'string').join(' ');
    return yield (new Promise((res, rej) => {
        child_process_1.exec(`${command} ${cli_params}`, opt, (err, stdout, stderr) => {
            if (err)
                return rej(err);
            return res([
                (stdout || stderr),
                (!lodash_1.isEmpty(stdout) ? 0 : 1)
            ]);
        });
    }));
});
exports.default = bash;
//# sourceMappingURL=bash.js.map
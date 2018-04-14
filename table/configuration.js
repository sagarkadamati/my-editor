"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
exports.section = 'text-tables';
exports.modeKey = 'mode';
exports.showStatusKey = 'showStatus';
var Mode;
(function (Mode) {
    Mode["Org"] = "org";
    Mode["Markdown"] = "markdown";
})(Mode = exports.Mode || (exports.Mode = {}));
function get(key, defaultValue) {
    return vscode.workspace.getConfiguration(exports.section).get(key, defaultValue);
}
exports.get = get;
//# sourceMappingURL=configuration.js.map
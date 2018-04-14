'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const ttOrg_1 = require("./ttOrg");
const ttTable_1 = require("./ttTable");
const ttMarkdown_1 = require("./ttMarkdown");
const util_1 = require("util");
const context_1 = require("./context");
const configuration = require("./configuration");
let locator;
let parser;
let stringifier;
function loadConfiguration() {
    const mode = configuration.get(configuration.modeKey, configuration.Mode.Markdown);
    if (mode === configuration.Mode.Org) {
        locator = new ttOrg_1.OrgLocator();
        parser = new ttOrg_1.OrgParser();
        stringifier = new ttOrg_1.OrgStringifier();
    }
    else {
        locator = new ttMarkdown_1.MarkdownLocator();
        parser = new ttMarkdown_1.MarkdownParser();
        stringifier = new ttMarkdown_1.MarkdownStringifier();
    }
}
function activate(ctx) {
    const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    context_1.registerContext(context_1.ContextType.TableMode, '$(book) Table Mode', statusItem);
    if (configuration.get(configuration.showStatusKey, true)) {
        statusItem.show();
    }
    loadConfiguration();
    vscode.workspace.onDidChangeConfiguration(() => {
        loadConfiguration();
        if (configuration.get(configuration.showStatusKey, true)) {
            statusItem.show();
        }
        else {
            statusItem.hide();
        }
    });
    vscode.window.onDidChangeActiveTextEditor(e => {
        if (e) {
            context_1.restoreContext(e);
        }
    });
    // Command for manually enabling extension
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.enable', () => {
        vscode.window.showInformationMessage('Text tables enabled!');
    }));
    // Enter table mode context
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.tableModeOn', () => {
        if (vscode.window.activeTextEditor) {
            context_1.enterContext(vscode.window.activeTextEditor, context_1.ContextType.TableMode);
        }
    }));
    // Exit table mode context
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.tableModeOff', () => {
        if (vscode.window.activeTextEditor) {
            context_1.exitContext(vscode.window.activeTextEditor, context_1.ContextType.TableMode);
        }
    }));
    // Clear cell under cursor
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.clearCell', () => {
        const editor = vscode.window.activeTextEditor;
        const document = editor.document;
        const currentLineNumber = editor.selection.start.line;
        const currentLine = document.lineAt(currentLineNumber);
        if (parser.isSeparatorRow(currentLine.text)) {
            vscode.window.showInformationMessage('Not in table data field');
            return;
        }
        const leftSepPosition = currentLine.text.lastIndexOf('|', editor.selection.start.character - 1);
        let rightSepPosition = currentLine.text.indexOf('|', editor.selection.start.character);
        if (rightSepPosition < 0) {
            rightSepPosition = currentLine.range.end.character;
        }
        if (leftSepPosition === rightSepPosition) {
            vscode.window.showInformationMessage('Not in table data field');
            return;
        }
        editor.edit(e => {
            const r = new vscode.Range(currentLineNumber, leftSepPosition + 1, currentLineNumber, rightSepPosition);
            e.replace(r, ' '.repeat(rightSepPosition - leftSepPosition - 1));
        });
        const newPos = new vscode.Position(currentLineNumber, leftSepPosition + 2);
        editor.selection = new vscode.Selection(newPos, newPos);
    }));
    // Jump to next cell
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.gotoNextCell', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const table = formatAndGetTableUnderCursor(editor);
            if (table) {
                const nav = new ttTable_1.TableNavigator(table);
                const newPos = nav.nextCell(editor.selection.start);
                if (newPos) {
                    editor.selection = new vscode.Selection(newPos, newPos);
                }
            }
        }
    }));
    // Jump to previous cell
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.gotoPreviousCell', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const table = formatAndGetTableUnderCursor(editor);
            if (table) {
                const nav = new ttTable_1.TableNavigator(table);
                const newPos = nav.previousCell(editor.selection.start);
                if (newPos) {
                    editor.selection = new vscode.Selection(newPos, newPos);
                }
            }
        }
    }));
    // Format table under cursor
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.formatUnderCursor', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            formatAndGetTableUnderCursor(editor);
        }
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.createTable', () => {
        if (util_1.isUndefined(vscode.window.activeTextEditor)) {
            vscode.window.showInformationMessage('Open editor first');
            return;
        }
        const editor = vscode.window.activeTextEditor;
        const re = /^(\d+)x(\d+)$/u;
        const opts = {
            value: '5x2',
            prompt: 'Table size Columns x Rows (e.g. 5x2)',
            validateInput: (value) => {
                if (!re.test(value)) {
                    return 'Provided value is invalid. Please provide the value in format Columns x Rows (e.g. 5x2)';
                }
                return;
            }
        };
        vscode.window.showInputBox(opts).then(x => {
            if (!x) {
                return;
            }
            const match = x.match(re);
            if (match) {
                const cols = +match[1] || 1;
                const rows = +match[2] || 2;
                const table = new ttTable_1.Table();
                for (let i = 0; i < rows + 1; i++) {
                    const rowType = (i === 1)
                        ? ttTable_1.RowType.Separator
                        : ttTable_1.RowType.Data;
                    table.addRow(rowType, new Array(cols).fill(''));
                }
                const currentPosition = editor.selection.start;
                editor
                    .edit(b => b.insert(currentPosition, stringifier.stringify(table)))
                    .then(() => editor.selection = new vscode.Selection(currentPosition, currentPosition));
            }
        });
    }));
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
/**
 * Try to find table in provided editor in current cursor position.
 * If table was found, formats the table and returns it. Otherwise - returns undefined.
 * @param editor active editor
 * @returns
 */
function formatAndGetTableUnderCursor(editor) {
    const tableRange = locator.locate(editor.document, editor.selection.start.line);
    if (util_1.isUndefined(tableRange)) {
        return undefined;
    }
    const selectedText = editor.document.getText(tableRange);
    const table = parser.parse(selectedText);
    if (util_1.isUndefined(table)) {
        return undefined;
    }
    table.startLine = tableRange.start.line;
    const newText = stringifier.stringify(table);
    editor.edit(b => b.replace(tableRange, newText));
    return table;
}
//# sourceMappingURL=extension.js.map
// Slopwash VS Code Extension
// Scaffolding — depends on the `slopwash` npm package being published first.
//
// To develop locally:
//   1. cd packages/analyzer && npm link
//   2. cd extensions/vscode && npm link slopwash
//   3. npm run watch
//   4. Press F5 in VS Code to launch the Extension Development Host

import * as vscode from "vscode";

// The slopwash import will resolve once the npm package is published or linked.
// import { analyze } from "slopwash";

const diagnosticCollection =
  vscode.languages.createDiagnosticCollection("slopwash");

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("slopwash.scanDocument", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      scanDocument(editor.document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("slopwash.scanSelection", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.selection.isEmpty) return;
      const text = editor.document.getText(editor.selection);
      vscode.window.showInformationMessage(
        `Slopwash: scanning ${text.split(/\s+/).length} words...`
      );
      // const result = analyze(text, { model: getConfiguredModel() });
      // showResults(result, editor);
    })
  );

  const config = vscode.workspace.getConfiguration("slopwash");
  if (config.get<boolean>("scanOnSave")) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (
          doc.languageId === "markdown" ||
          doc.languageId === "plaintext"
        ) {
          scanDocument(doc);
        }
      })
    );
  }
}

function scanDocument(document: vscode.TextDocument) {
  const text = document.getText();
  vscode.window.showInformationMessage(
    `Slopwash: scanning ${text.split(/\s+/).length} words...`
  );

  // TODO: uncomment when slopwash npm package is available
  // const config = vscode.workspace.getConfiguration("slopwash");
  // const model = config.get<string>("model") || undefined;
  // const result = analyze(text, model ? { model } : undefined);
  //
  // const diagnostics: vscode.Diagnostic[] = result.violations.map((v) => {
  //   const start = document.positionAt(v.offset);
  //   const end = document.positionAt(v.offset + v.length);
  //   const range = new vscode.Range(start, end);
  //   const severity =
  //     v.severity === "high"
  //       ? vscode.DiagnosticSeverity.Error
  //       : v.severity === "moderate"
  //         ? vscode.DiagnosticSeverity.Warning
  //         : vscode.DiagnosticSeverity.Information;
  //   const diag = new vscode.Diagnostic(range, v.message, severity);
  //   diag.source = "slopwash";
  //   diag.code = v.rule;
  //   return diag;
  // });
  //
  // diagnosticCollection.set(document.uri, diagnostics);
  // vscode.window.showInformationMessage(
  //   `Slopwash: score ${result.score}/100 — ${result.violations.length} issues found`
  // );
}

export function deactivate() {
  diagnosticCollection.dispose();
}

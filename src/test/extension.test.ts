import * as assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "@shared/settings";
import * as vscode from "vscode";

const EXTENSION_ID = "Jeusto.warm-up-typing-test";

suite("Warm Up extension", () => {
  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `extension ${EXTENSION_ID} not found`);
    await extension.activate();
  });

  test("activates", () => {
    assert.equal(vscode.extensions.getExtension(EXTENSION_ID)?.isActive, true);
  });

  test("registers every contributed command", async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    const contributed: { command: string }[] = extension?.packageJSON.contributes.commands ?? [];
    const registered = await vscode.commands.getCommands(true);

    assert.ok(contributed.length > 0, "no commands contributed");
    for (const { command } of contributed) {
      assert.ok(registered.includes(command), `${command} is not registered`);
    }
  });

  test("ships defaults that match the shared schema", () => {
    const config = vscode.workspace.getConfiguration("warmUp");

    for (const [key, expected] of Object.entries(DEFAULT_SETTINGS)) {
      assert.deepEqual(config.get(key), expected, `default for warmUp.${key}`);
    }
  });

  test("opens the panel without throwing", async () => {
    await vscode.commands.executeCommand("warmUp.start");
    // Give the webview a tick to come up before the suite tears down.
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  test("reports a friendly message when practising without an editor", async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await vscode.commands.executeCommand("warmUp.practiceWithSelection");
  });
});

suite("Typing in the editor", () => {
  suiteSetup(async () => {
    await vscode.extensions.getExtension(EXTENSION_ID)?.activate();
  });

  teardown(async () => {
    await vscode.commands.executeCommand("warmUp.editor.stop");
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("opens a read-only snippet and advances as the user types", async () => {
    await vscode.commands.executeCommand("warmUp.startInEditor");

    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, "no editor opened");
    assert.equal(editor.document.uri.scheme, "warmup");
    assert.ok(editor.document.getText().length > 0, "snippet is empty");

    const target = editor.document.getText();
    const before = editor.document.getText();

    // `type` is what the editor invokes for every printable key.
    for (const char of target.slice(0, 5)) {
      await vscode.commands.executeCommand("type", { text: char });
    }

    assert.equal(
      editor.document.getText(),
      before,
      "the document must never change: it is the target, not a scratchpad",
    );
    assert.ok(
      editor.selection.active.isAfter(new vscode.Position(0, 0)),
      "the caret should have advanced",
    );
  });

  test("backspace steps the caret back", async () => {
    await vscode.commands.executeCommand("warmUp.startInEditor");
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor);

    const target = editor.document.getText();
    for (const char of target.slice(0, 4)) {
      await vscode.commands.executeCommand("type", { text: char });
    }
    const advanced = editor.selection.active;

    await vscode.commands.executeCommand("warmUp.editor.backspace");

    assert.ok(editor.selection.active.isBefore(advanced), "caret did not move back");
  });

  test("restores normal typing in other editors once the run stops", async () => {
    await vscode.commands.executeCommand("warmUp.startInEditor");
    await vscode.commands.executeCommand("warmUp.editor.stop");

    const scratch = await vscode.workspace.openTextDocument({ content: "", language: "plaintext" });
    await vscode.window.showTextDocument(scratch);
    await vscode.commands.executeCommand("type", { text: "hello" });

    assert.equal(scratch.getText(), "hello");
  });
});

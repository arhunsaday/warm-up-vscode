import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { DEFAULT_SETTINGS } from "../../shared/settings";

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

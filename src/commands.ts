import { SNIPPETS } from "@core/data";
import { pickSnippet } from "@core/engine/generator";
import { type TestResult, resultKey } from "@shared/messages";
import { SETTING_DEFINITIONS, type SettingDefinition } from "@shared/settings";
import { type ExtensionContext, type QuickPickItem, type Uri, commands, window } from "vscode";
import { readSettings, writeSetting } from "./config";
import { EditorSession } from "./editorSession";
import { WarmUpPanel } from "./panel";
import type { ResultStore } from "./storage";

/** Longest snippet we hand to the webview; beyond this a test stops being fun. */
const MAX_CUSTOM_TEXT = 5000;

export function registerCommands(context: ExtensionContext, store: ResultStore): void {
  const { extensionUri } = context;
  const register = (id: string, handler: (...args: unknown[]) => unknown) =>
    context.subscriptions.push(commands.registerCommand(id, handler));

  register("warmUp.start", () => {
    WarmUpPanel.show(extensionUri, store);
  });

  register("warmUp.practiceWithSelection", () =>
    practiceWithEditor(extensionUri, store, "selection"),
  );
  register("warmUp.practiceWithFile", () => practiceWithEditor(extensionUri, store, "file"));
  register("warmUp.startInEditor", () => startSnippetInEditor(extensionUri, store));

  // Reachable only while a run is in progress, through the context key.
  register("warmUp.editor.backspace", () => EditorSession.current()?.backspace(false));
  register("warmUp.editor.deleteWord", () => EditorSession.current()?.backspace(true));
  register("warmUp.editor.tab", () => EditorSession.current()?.tab());
  register("warmUp.editor.restart", () => EditorSession.current()?.restart());
  register("warmUp.editor.stop", () => EditorSession.current()?.dispose());

  register("warmUp.settings", () => pickSetting());

  for (const definition of SETTING_DEFINITIONS) {
    if (!definition.command) {
      continue;
    }
    register(definition.command, () => applySetting(definition));
  }

  register("warmUp.showPersonalBests", () => showPersonalBests(store));

  register("warmUp.clearHistory", async () => {
    const confirmation = await window.showWarningMessage(
      "Delete every saved Warm Up result? This cannot be undone.",
      { modal: true },
      "Delete",
    );
    if (confirmation === "Delete") {
      await store.clear();
      void window.showInformationMessage("Warm Up: results history cleared.");
    }
  });
}

async function practiceWithEditor(
  extensionUri: Uri,
  store: ResultStore,
  source: "selection" | "file",
): Promise<void> {
  const editor = window.activeTextEditor;
  if (!editor) {
    void window.showWarningMessage("Warm Up: open a file first.");
    return;
  }

  const raw =
    source === "selection"
      ? editor.selections.map((selection) => editor.document.getText(selection)).join("\n")
      : editor.document.getText();

  const text = raw.trim();
  if (!text) {
    void window.showWarningMessage(
      source === "selection" ? "Warm Up: select some text first." : "Warm Up: this file is empty.",
    );
    return;
  }

  if (text.length > MAX_CUSTOM_TEXT) {
    void window.showInformationMessage(
      `Warm Up: text truncated to the first ${MAX_CUSTOM_TEXT} characters.`,
    );
  }

  const payload = {
    text: text.slice(0, MAX_CUSTOM_TEXT),
    languageId: editor.document.languageId,
    origin:
      source === "selection"
        ? "selection"
        : editor.document.uri.path.split("/").pop() || "current file",
  };

  // Code selected in the editor is most natural to retype in the editor.
  if (readSettings().codeInEditor) {
    const session = await EditorSession.start({
      target: payload.text,
      languageId: payload.languageId,
      label: payload.origin,
      store,
    });
    if (session) {
      return;
    }
    void window.showInformationMessage(
      "Warm Up: another extension owns the editor's typing, so the test opened in the panel instead.",
    );
  }

  WarmUpPanel.show(extensionUri, store).practiceWith(payload);
}

/** Types a random snippet for the configured language, in a real editor tab. */
async function startSnippetInEditor(extensionUri: Uri, store: ResultStore): Promise<void> {
  const settings = readSettings();
  const snippet = pickSnippet(SNIPPETS[settings.programmingLanguage] ?? []);

  if (!snippet) {
    void window.showWarningMessage(
      `Warm Up: no snippets available for ${settings.programmingLanguage}.`,
    );
    return;
  }

  const session = await EditorSession.start({
    target: snippet,
    languageId: settings.programmingLanguage,
    label: settings.programmingLanguage,
    store,
  });

  if (!session) {
    void window.showInformationMessage(
      "Warm Up: another extension owns the editor's typing, so the test opened in the panel instead.",
    );
    WarmUpPanel.show(extensionUri, store);
  }
}

async function pickSetting(): Promise<void> {
  const settings = readSettings();

  const picked = await window.showQuickPick(
    SETTING_DEFINITIONS.map((definition) => ({
      label: definition.title,
      description: String(settings[definition.key]),
      detail: definition.prompt,
      definition,
    })),
    { placeHolder: "Which Warm Up setting do you want to change?", matchOnDetail: true },
  );

  if (picked) {
    await applySetting(picked.definition);
  }
}

async function applySetting(definition: SettingDefinition): Promise<void> {
  const settings = readSettings();
  const current = settings[definition.key];

  switch (definition.kind) {
    case "boolean": {
      const next = !current;
      await writeSetting(definition.key, next);
      void window.setStatusBarMessage(
        `Warm Up: ${definition.title.toLowerCase()} ${next ? "on" : "off"}`,
        2000,
      );
      break;
    }

    case "number": {
      const input = await window.showInputBox({
        title: definition.title,
        prompt: `${definition.prompt} (${definition.min}–${definition.max})`,
        value: String(current),
        validateInput: (value) => {
          const parsed = Number(value);
          if (Number.isNaN(parsed) || parsed < definition.min || parsed > definition.max) {
            return `Enter a number between ${definition.min} and ${definition.max}.`;
          }
          return undefined;
        },
      });
      if (input !== undefined) {
        await writeSetting(definition.key, Number(input));
      }
      break;
    }

    case "enum": {
      const items: (QuickPickItem & { value: string | number })[] = definition.values.map(
        (value) => {
          const icon = definition.icons?.[String(value)];
          return {
            label: icon ? `$(${icon}) ${value}` : String(value),
            description: value === current ? "current" : undefined,
            value,
          };
        },
      );

      const picked = await window.showQuickPick(items, { placeHolder: definition.prompt });
      if (picked) {
        await writeSetting(definition.key, picked.value);
      }
      break;
    }
  }
}

async function showPersonalBests(store: ResultStore): Promise<void> {
  const bests = store.personalBests();

  if (bests.length === 0) {
    const action = await window.showInformationMessage(
      "Warm Up: no results yet. Finish a test to record your first personal best.",
      "Start a test",
    );
    if (action) {
      await commands.executeCommand("warmUp.start");
    }
    return;
  }

  await window.showQuickPick(
    bests.map((best: TestResult) => ({
      label: `$(flame) ${best.speed} ${best.unit}`,
      description: resultKey(best),
      detail: `${best.accuracy}% accuracy · ${best.consistency}% consistency · ${new Date(
        best.date,
      ).toLocaleDateString()}`,
    })),
    { placeHolder: "Warm Up personal bests" },
  );
}

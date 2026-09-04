import {
  type CodeState,
  backspace as codeBackspace,
  codeCounts,
  tab as codeTab,
  typeChar as codeTypeChar,
  createCodeState,
  typeableLength,
  typedLength,
} from "@core/engine/code";
import { normalizeCode } from "@core/engine/generator";
import { computeStats } from "@core/engine/stats";
import type { Keystroke } from "@core/engine/types";
import type { TestResult } from "@shared/messages";
import type { StopOnError } from "@shared/settings";
import {
  type Disposable,
  type ExtensionContext,
  Range,
  Selection,
  StatusBarAlignment,
  type TextDocumentContentProvider,
  type TextEditor,
  TextEditorRevealType,
  ThemeColor,
  Uri,
  commands,
  languages,
  window,
  workspace,
} from "vscode";
import { readSettings } from "./config";
import type { ResultStore } from "./storage";

export const SCHEME = "warmup";
const CONTEXT_KEY = "warmUp.typingInEditor";

/** File extension per language id, so the tab and the grammar look right. */
const EXTENSIONS: Record<string, string> = {
  javascript: "js",
  javascriptreact: "jsx",
  typescript: "ts",
  typescriptreact: "tsx",
  python: "py",
  java: "java",
  csharp: "cs",
  cpp: "cpp",
  c: "c",
  go: "go",
  kotlin: "kt",
  php: "php",
  ruby: "rb",
  rust: "rs",
};

/**
 * Serves the snippet as a virtual document. Documents from a content provider
 * are read-only, which is exactly what we want: the text cannot drift from the
 * target no matter what the user pastes, undoes or drags into it.
 */
class SnippetProvider implements TextDocumentContentProvider {
  private readonly contents = new Map<string, string>();

  set(uri: Uri, text: string): void {
    this.contents.set(uri.toString(), text);
  }

  provideTextDocumentContent(uri: Uri): string {
    return this.contents.get(uri.toString()) ?? "";
  }
}

const provider = new SnippetProvider();
let sequence = 0;

export function registerEditorSessionProvider(context: ExtensionContext): void {
  context.subscriptions.push(workspace.registerTextDocumentContentProvider(SCHEME, provider));
}

export interface EditorSessionOptions {
  target: string;
  languageId: string;
  /** Recorded with the result: a language name, or where a snippet came from. */
  label: string;
  store: ResultStore;
  onFinished?: (result: TestResult) => void;
}

/**
 * A typing test that runs in a real editor tab.
 *
 * Input arrives by overriding the built-in `type` command — the same mechanism
 * modal-editing extensions use, and the only way to observe every printable
 * key. Everything else (backspace, tab, escape) is a normal command bound
 * behind the `warmUp.typingInEditor` context key, so it only applies here.
 */
export class EditorSession {
  private static active: EditorSession | undefined;

  private readonly disposables: Disposable[] = [];
  private readonly keystrokes: Keystroke[] = [];
  private readonly status = window.createStatusBarItem(StatusBarAlignment.Right, 100);

  private state: CodeState;
  private startedAt = 0;
  private finished = false;

  private readonly untyped = window.createTextEditorDecorationType({ opacity: "0.4" });
  private readonly wrong = window.createTextEditorDecorationType({
    backgroundColor: new ThemeColor("inputValidation.errorBackground"),
    borderRadius: "2px",
  });

  private constructor(
    private readonly editor: TextEditor,
    private readonly options: EditorSessionOptions,
  ) {
    this.state = createCodeState(editor.document.getText());
  }

  static current(): EditorSession | undefined {
    return EditorSession.active;
  }

  /**
   * Opens the snippet in an editor and takes over typing. Returns undefined
   * when another extension already owns the `type` command (a modal-editing
   * extension, typically), so the caller can fall back to the panel.
   */
  static async start(options: EditorSessionOptions): Promise<EditorSession | undefined> {
    EditorSession.active?.dispose();

    const target = normalizeCode(options.target);
    if (!target) {
      return undefined;
    }

    sequence += 1;
    const extension = EXTENSIONS[options.languageId] ?? "txt";
    const uri = Uri.parse(`${SCHEME}:practice-${sequence}.${extension}`);
    provider.set(uri, target);

    const document = await workspace.openTextDocument(uri);
    await languages.setTextDocumentLanguage(document, options.languageId).then(undefined, () => {
      // An unknown language id is not worth failing the session over.
    });

    const editor = await window.showTextDocument(document, { preview: false });
    const session = new EditorSession(editor, options);

    if (!session.claimTypeCommand()) {
      session.dispose();
      return undefined;
    }

    await session.activate();
    return session;
  }

  /**
   * `type` can only be registered by one extension at a time. Failing to claim
   * it is expected when a modal-editing extension is installed.
   */
  private claimTypeCommand(): boolean {
    try {
      this.disposables.push(
        commands.registerCommand("type", (args: { text: string }) => {
          const active = window.activeTextEditor;
          if (active?.document.uri.toString() !== this.editor.document.uri.toString()) {
            return commands.executeCommand("default:type", args);
          }
          for (const char of args?.text ?? "") {
            this.input(char);
          }
          return undefined;
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  private async activate(): Promise<void> {
    EditorSession.active = this;
    await commands.executeCommand("setContext", CONTEXT_KEY, true);

    this.status.text = "$(record-keys) 0 wpm";
    this.status.tooltip = "Warm Up — esc restarts, shift+esc stops";
    this.status.show();

    // Leaving the tab ends the run; there is nothing to type into any more.
    this.disposables.push(
      window.onDidChangeVisibleTextEditors((editors) => {
        if (!editors.some((editor) => editor.document.uri.toString() === this.uri)) {
          this.dispose();
        }
      }),
    );

    this.render();
  }

  private get uri(): string {
    return this.editor.document.uri.toString();
  }

  private input(char: string): void {
    if (this.finished) {
      return;
    }

    const now = Date.now();
    if (this.startedAt === 0) {
      this.startedAt = now;
    }

    const stopOnError: StopOnError = readSettings().stopOnError;
    const step = codeTypeChar(this.state, char, { stopOnError });
    if (step.outcome === "ignored") {
      return;
    }

    this.keystrokes.push({ at: now - this.startedAt, correct: step.outcome === "correct" });
    this.state = step.state;

    if (this.state.finished) {
      void this.finish();
      return;
    }

    this.render();
  }

  backspace(wholeWord: boolean): void {
    if (this.finished) {
      return;
    }
    this.state = codeBackspace(this.state, wholeWord);
    this.render();
  }

  tab(): void {
    if (this.finished) {
      return;
    }
    this.state = codeTab(this.state);
    this.render();
  }

  restart(): void {
    this.state = createCodeState(this.state.target);
    this.keystrokes.length = 0;
    this.startedAt = 0;
    this.finished = false;
    this.render();
  }

  /** Exposed for the integration tests. */
  progress(): { done: number; total: number } {
    return { done: typedLength(this.state), total: typeableLength(this.state) };
  }

  private render(): void {
    const { document } = this.editor;
    const caret = document.positionAt(this.state.index);

    // Everything from the caret onwards is still to be typed.
    this.editor.setDecorations(this.untyped, [
      new Range(caret, document.positionAt(document.getText().length)),
    ]);

    const mistakes: Range[] = [];
    for (let index = 0; index < this.state.states.length; index += 1) {
      if (this.state.states[index] === "incorrect") {
        mistakes.push(new Range(document.positionAt(index), document.positionAt(index + 1)));
      }
    }
    this.editor.setDecorations(this.wrong, mistakes);

    // The editor's own cursor is the caret: native blinking, native theme.
    this.editor.selection = new Selection(caret, caret);
    this.editor.revealRange(
      new Range(caret, caret),
      TextEditorRevealType.InCenterIfOutsideViewport,
    );

    this.updateStatus();
  }

  private updateStatus(): void {
    const elapsed = this.startedAt === 0 ? 0 : Date.now() - this.startedAt;
    const stats = computeStats(codeCounts(this.state), this.keystrokes, Math.max(elapsed, 1));
    const { done, total } = this.progress();

    this.status.text = `$(record-keys) ${stats.speed} wpm · ${done}/${total}`;
  }

  private async finish(): Promise<void> {
    this.finished = true;
    const durationMs = Date.now() - this.startedAt;
    const counts = codeCounts(this.state);
    const stats = computeStats(counts, this.keystrokes, durationMs);
    const settings = readSettings();

    const result: TestResult = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: Date.now(),
      mode: "code",
      language: this.options.label,
      count: 0,
      punctuation: settings.punctuation,
      numbers: settings.numbers,
      durationMs,
      ...stats,
      ...counts,
    };

    await this.options.store.add(result);
    this.options.onFinished?.(result);

    this.status.text = `$(record-keys) ${result.speed} wpm · ${result.accuracy}%`;

    const action = await window.showInformationMessage(
      `Warm Up: ${result.speed} wpm at ${result.accuracy}% accuracy.`,
      "Again",
      "Close",
    );

    if (action === "Again") {
      this.restart();
      return;
    }

    this.dispose();
    await commands.executeCommand("workbench.action.closeActiveEditor");
  }

  dispose(): void {
    if (EditorSession.active === this) {
      EditorSession.active = undefined;
      void commands.executeCommand("setContext", CONTEXT_KEY, false);
    }

    this.untyped.dispose();
    this.wrong.dispose();
    this.status.dispose();

    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}

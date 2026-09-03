import {
  type Disposable,
  Uri,
  ViewColumn,
  type Webview,
  type WebviewPanel,
  commands,
  window,
  workspace,
} from "vscode";
import type { CustomText, HostMessage, WebviewMessage } from "../shared/messages";
import type { SettingKey } from "../shared/settings";
import { CONFIG_SECTION, readSettings, writeSetting } from "./config";
import type { ResultStore } from "./storage";

export class WarmUpPanel {
  public static readonly viewType = "warmUp";
  private static current: WarmUpPanel | undefined;

  private readonly disposables: Disposable[] = [];
  /** Queued until the webview reports it is ready to receive messages. */
  private pendingCustomText: CustomText | undefined;
  private ready = false;

  private constructor(
    private readonly panel: WebviewPanel,
    private readonly extensionUri: Uri,
    private readonly store: ResultStore,
  ) {
    this.panel.webview.html = this.render(this.panel.webview);
    this.panel.iconPath = {
      light: Uri.joinPath(extensionUri, "assets", "panel-icon-light.svg"),
      dark: Uri.joinPath(extensionUri, "assets", "panel-icon-dark.svg"),
    };

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => this.onMessage(message),
      null,
      this.disposables,
    );

    // Settings can also change from the settings editor or another window.
    workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration(CONFIG_SECTION)) {
          this.post({ type: "settings", settings: readSettings() });
        }
      },
      null,
      this.disposables,
    );
  }

  static show(extensionUri: Uri, store: ResultStore): WarmUpPanel {
    const column = window.activeTextEditor?.viewColumn ?? ViewColumn.One;

    if (WarmUpPanel.current) {
      WarmUpPanel.current.panel.reveal(column, false);
      WarmUpPanel.current.post({ type: "focus" });
      return WarmUpPanel.current;
    }

    const panel = window.createWebviewPanel(
      WarmUpPanel.viewType,
      "Warm Up",
      column,
      WarmUpPanel.webviewOptions(extensionUri),
    );

    WarmUpPanel.current = new WarmUpPanel(panel, extensionUri, store);
    return WarmUpPanel.current;
  }

  static revive(panel: WebviewPanel, extensionUri: Uri, store: ResultStore): void {
    panel.webview.options = WarmUpPanel.webviewOptions(extensionUri);
    WarmUpPanel.current = new WarmUpPanel(panel, extensionUri, store);
  }

  private static webviewOptions(extensionUri: Uri) {
    return {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        Uri.joinPath(extensionUri, "dist", "webview"),
        Uri.joinPath(extensionUri, "assets"),
      ],
    };
  }

  practiceWith(payload: CustomText): void {
    if (this.ready) {
      this.post({ type: "customText", payload });
    } else {
      this.pendingCustomText = payload;
    }
  }

  private post(message: HostMessage): void {
    void this.panel.webview.postMessage(message);
  }

  private async onMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case "ready": {
        this.ready = true;
        this.post({ type: "settings", settings: readSettings() });
        this.post({ type: "history", results: this.store.all() });
        if (this.pendingCustomText) {
          this.post({ type: "customText", payload: this.pendingCustomText });
          this.pendingCustomText = undefined;
        }
        break;
      }

      case "updateSetting":
        await writeSetting(message.key as SettingKey, message.value);
        break;

      case "saveResult": {
        const results = await this.store.add(message.result);
        this.post({ type: "history", results });
        break;
      }

      case "clearHistory":
        await this.store.clear();
        this.post({ type: "history", results: [] });
        break;

      case "openSettings":
        await commands.executeCommand(
          "workbench.action.openSettings",
          "@ext:Jeusto.warm-up-typing-test",
        );
        break;

      case "notify":
        if (message.level === "error") {
          void window.showErrorMessage(message.message);
        } else {
          void window.showInformationMessage(message.message);
        }
        break;
    }
  }

  private render(webview: Webview): string {
    const nonce = createNonce();
    const asset = (...segments: string[]) =>
      webview.asWebviewUri(Uri.joinPath(this.extensionUri, ...segments));

    const script = asset("dist", "webview", "webview.js");
    const style = asset("dist", "webview", "webview.css");

    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} data:`,
      `font-src ${webview.cspSource}`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
    ].join("; ");

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${style}" rel="stylesheet" />
    <title>Warm Up</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" type="module" src="${script}"></script>
  </body>
</html>`;
  }

  dispose(): void {
    WarmUpPanel.current = undefined;
    this.panel.dispose();

    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return nonce;
}

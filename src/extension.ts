import type { ExtensionContext, WebviewPanel } from "vscode";
import { window } from "vscode";
import { registerCommands } from "./commands";
import { migrateLegacySettings } from "./config";
import { WarmUpPanel } from "./panel";
import { registerStatusBar } from "./statusBar";
import { ResultStore } from "./storage";

export async function activate(context: ExtensionContext): Promise<void> {
  const store = new ResultStore(context.globalState);
  context.subscriptions.push(store);

  await migrateSettingsOnce(store);

  registerStatusBar(context, store);
  registerCommands(context, store);

  context.subscriptions.push(
    window.registerWebviewPanelSerializer(WarmUpPanel.viewType, {
      async deserializeWebviewPanel(panel: WebviewPanel) {
        WarmUpPanel.revive(panel, context.extensionUri, store);
      },
    }),
  );
}

export function deactivate(): void {
  // Everything is registered through `context.subscriptions`.
}

/** Carries v1 preferences over to the v2 setting names, exactly once. */
async function migrateSettingsOnce(store: ResultStore): Promise<void> {
  if (store.hasMigrated()) {
    return;
  }

  try {
    const migrated = await migrateLegacySettings();
    if (migrated.length > 0) {
      void window.setStatusBarMessage("Warm Up: settings migrated to the new format.", 4000);
    }
  } catch (error) {
    console.error("Warm Up: failed to migrate legacy settings", error);
  } finally {
    await store.markMigrated();
  }
}

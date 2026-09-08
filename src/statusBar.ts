import { type ExtensionContext, StatusBarAlignment, window } from "vscode";
import type { ResultStore } from "./storage";

/**
 * Status bar entry: starts a test, and shows the current personal best so the
 * number you are chasing is always visible.
 */
export function registerStatusBar(context: ExtensionContext, store: ResultStore): void {
  const item = window.createStatusBarItem("warmUp.start", StatusBarAlignment.Left, 1);
  item.command = "warmUp.start";
  item.name = "Warm Up";

  const refresh = () => {
    const [best] = store.personalBests();
    item.text = best ? `$(record-keys) ${best.speed} ${best.unit}` : "$(record-keys) Warm Up";
    item.tooltip = best
      ? `Warm Up — personal best: ${best.speed} ${best.unit} at ${best.accuracy}% accuracy. Click to start a test.`
      : "Warm Up — start a typing test";
  };

  refresh();
  item.show();

  context.subscriptions.push(item, store.onDidChange(refresh));
}

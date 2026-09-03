import type { HostMessage, WebviewMessage, WebviewState } from "../../shared/messages";

interface VsCodeApi {
  postMessage(message: WebviewMessage): void;
  getState(): WebviewState | undefined;
  setState(state: WebviewState): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

/** `acquireVsCodeApi` may only be called once per webview. */
const api: VsCodeApi = acquireVsCodeApi();

export function postMessage(message: WebviewMessage): void {
  api.postMessage(message);
}

export function getState(): WebviewState | undefined {
  return api.getState();
}

export function setState(state: WebviewState): void {
  api.setState(state);
}

export function onHostMessage(handler: (message: HostMessage) => void): () => void {
  const listener = (event: MessageEvent<HostMessage>) => handler(event.data);
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}

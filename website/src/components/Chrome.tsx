import { Link } from "react-router";
import { useTypingStatus } from "../typing/status";

export const MARKETPLACE =
  "https://marketplace.visualstudio.com/items?itemName=Jeusto.warm-up-typing-test";
export const OPEN_VSX = "https://open-vsx.org/extension/Jeusto/warm-up-typing-test";
export const REPO = "https://github.com/Jeusto/warm-up-vscode";

/**
 * The page wears the product's clothes: a title bar at the top and a live
 * status bar at the bottom, because that is where the extension lives.
 */
export function TitleBar() {
  return (
    <div className="titlebar">
      <span className="titlebar__lights" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="titlebar__title">Warm up — typing test</span>
      <nav className="titlebar__actions">
        <Link to="/app">Play in browser</Link>
        <a href={REPO} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={MARKETPLACE} target="_blank" rel="noreferrer">
          Marketplace
        </a>
      </nav>
    </div>
  );
}

export function StatusBar() {
  const status = useTypingStatus();
  const live = status.source !== null;

  return (
    <div className={`statusbar${live ? " statusbar--live" : ""}`}>
      <span className="statusbar__brand">
        <KeyboardGlyph />
        Warm Up
      </span>

      {live ? (
        <>
          <span className="statusbar__item statusbar__item--accent">
            {status.credible ? `${status.speed} wpm` : "— wpm"}
          </span>
          <span className="statusbar__item">{status.accuracy}% acc</span>
          <span className="statusbar__item statusbar__item--dim">{status.progress}</span>
        </>
      ) : (
        <span className="statusbar__item statusbar__item--dim">
          click any block of text and start typing
        </span>
      )}

      <span className="statusbar__spacer" />
      {/* <a className="statusbar__item" href={OPEN_VSX} target="_blank" rel="noreferrer">
        Open VSX
      </a> */}
      <span className="statusbar__item statusbar__item--dim">GPL-3.0</span>
      <a
        className="statusbar__item statusbar__cta"
        href={MARKETPLACE}
        target="_blank"
        rel="noreferrer"
      >
        Install
      </a>
    </div>
  );
}

function KeyboardGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="currentColor">
      <path d="M1.5 3h13a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5Zm.5 1v8h12V4H2Zm1 1h1.5v1.5H3V5Zm2.5 0H7v1.5H5.5V5ZM8 5h1.5v1.5H8V5Zm2.5 0H12v1.5h-1.5V5ZM3 7.25h1.5v1.5H3v-1.5Zm2.5 0H7v1.5H5.5v-1.5Zm2.5 0h1.5v1.5H8v-1.5Zm2.5 0H12v1.5h-1.5v-1.5ZM4.5 9.5h7V11h-7V9.5Z" />
    </svg>
  );
}

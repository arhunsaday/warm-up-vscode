import { useState } from "react";
import { MARKETPLACE, REPO } from "./Chrome";
import { SectionHeading } from "./Playground";

const MODES = [
  {
    name: "words",
    tagline: "10 to 100 words, 14 languages",
    detail:
      "Generated from frequency lists, with optional punctuation and numbers when you want it harder.",
  },
  {
    name: "time",
    tagline: "15 / 30 / 60 / 120 seconds",
    detail: "Race the clock. The text tops itself up, so you never run out mid-sprint.",
  },
  {
    name: "quotes",
    tagline: "short, medium, long",
    detail: "Passages from public-domain writing — Austen, Melville, Lovelace, Turing.",
  },
  {
    name: "code",
    tagline: "12 languages, or your own file",
    detail:
      "Real snippets with syntax highlighting. Indentation is skipped for you; newlines are Enter.",
  },
  {
    name: "zen",
    tagline: "nothing to get wrong",
    detail: "No target text. Type until your hands wake up, then finish when you feel like it.",
  },
];

const FEATURES = [
  {
    title: "It runs in your editor",
    body: "Code practice opens a read-only editor tab. Your theme, your font, your syntax highlighting, and the editor's own cursor as the caret — the code lights up as you type it right.",
  },
  {
    title: "Practise your own code",
    body: "Select anything, hit ⌘⌥S. Or take the whole file. Nothing warms you up like the code you are about to write.",
  },
  {
    title: "Honest numbers",
    body: "Live speed, then raw, consistency and a second-by-second chart. Chinese and Korean are measured in characters per minute, because words-per-minute would understate you by a third.",
  },
  {
    title: "Stays on your machine",
    body: "Every run is stored locally. Your best per configuration sits in the status bar. No account, no server, no telemetry.",
  },
  {
    title: "Sound, if you want it",
    body: "Click, typewriter or beep, synthesised on the fly — with a distinct sound for a slip.",
  },
  {
    title: "Fair by default",
    body: "Stop on the first mistake if you want to. A colour-blind palette, a configurable caret, and dead keys, AltGr and IME all handled properly.",
  },
];

export function Modes() {
  const [open, setOpen] = useState(0);

  return (
    <section className="section" id="modes">
      <SectionHeading title="Five ways to warm up" />

      <ul className="modes">
        {MODES.map((mode, index) => (
          <li key={mode.name}>
            <button
              type="button"
              className={`mode${open === index ? " mode--open" : ""}`}
              onClick={() => setOpen(index)}
              aria-expanded={open === index}
            >
              <span className="mode__name">{mode.name}</span>
              <span className="mode__tagline">{mode.tagline}</span>
              <span className="mode__chevron" aria-hidden="true" />
            </button>
            <div className={`mode__reveal${open === index ? " mode__reveal--open" : ""}`}>
              <p className="mode__detail">{mode.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Features() {
  return (
    <section className="section" id="features">
      <SectionHeading title="What you get" />
      <div className="features">
        {FEATURES.map((feature) => (
          <SpotlightCard key={feature.title}>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
}

/** A card that lights up under the cursor. */
function SpotlightCard({ children }: { children: React.ReactNode }) {
  const [spot, setSpot] = useState({ x: -300, y: -300 });

  return (
    <article
      className="feature"
      style={{ "--spot-x": `${spot.x}px`, "--spot-y": `${spot.y}px` } as React.CSSProperties}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setSpot({ x: event.clientX - rect.left, y: event.clientY - rect.top });
      }}
      onMouseLeave={() => setSpot({ x: -300, y: -300 })}
    >
      {children}
    </article>
  );
}

export function Install() {
  const [copied, setCopied] = useState(false);
  const command = "code --install-extension Jeusto.warm-up-typing-test";

  return (
    <section className="section section--install" id="install">
      <SectionHeading title="Get it" />

      <div className="terminal">
        <div className="terminal__bar">
          <i />
          <i />
          <i />
          <span>zsh</span>
        </div>
        <div className="terminal__body">
          <span className="terminal__prompt">$</span>
          <code>{command}</code>
          <button
            type="button"
            className="terminal__copy"
            onClick={() => {
              void navigator.clipboard?.writeText(command);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? "copied" : "copy"}
          </button>
        </div>
      </div>

      <p className="section__lead section__lead--center">
        Or search <strong>Warm Up</strong> in the Extensions view.
      </p>

      <div className="install__links">
        <a className="button button--primary" href={MARKETPLACE} target="_blank" rel="noreferrer">
          VS Marketplace
        </a>
        {/* <a className="button" href={OPEN_VSX} target="_blank" rel="noreferrer">
          Open VSX
        </a> */}
        <a className="button" href={REPO} target="_blank" rel="noreferrer">
          Source
        </a>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <p>
        Free and open source under GPL-3.0, by{" "}
        <a href="https://github.com/Jeusto" target="_blank" rel="noreferrer">
          Jeusto
        </a>
        .
      </p>
      <nav className="footer__links">
        <a href={REPO} target="_blank" rel="noreferrer">
          Source
        </a>
        <a href={`${REPO}/issues`} target="_blank" rel="noreferrer">
          Report a bug
        </a>
        <a href={`${REPO}/blob/master/CONTRIBUTING.md`} target="_blank" rel="noreferrer">
          Contribute
        </a>
      </nav>
    </footer>
  );
}

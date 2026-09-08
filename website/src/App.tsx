import { Link } from "react-router";
import { StatusBar, TitleBar } from "./components/Chrome";
import { HeroTest } from "./components/HeroTest";
import { Playground } from "./components/Playground";
import { Features, Footer, Install, Modes } from "./components/Sections";
import { StatusProvider } from "./typing/status";

export function App() {
  return (
    <StatusProvider>
      <div className="aurora" aria-hidden="true" />
      <div className="grid" aria-hidden="true" />

      <TitleBar />

      <header className="hero">
        <p className="hero__eyebrow">A VS Code extension</p>
        <HeroTest />
        <div className="hero__actions">
          <Link className="button button--primary" to="/app">
            Play in the browser
          </Link>
          <a
            className="button"
            href="https://marketplace.visualstudio.com/items?itemName=Jeusto.warm-up-typing-test"
            target="_blank"
            rel="noreferrer"
          >
            Install for VS Code
          </a>
        </div>
        <p className="hero__lead">
          A typing test that lives in your editor. Words, quotes, the clock, or the code you are
          about to write — with live speed, honest accuracy, and personal bests that never leave
          your machine.
        </p>
      </header>

      <main>
        <Playground />
        <Modes />
        <Features />
        <Install />
      </main>

      <Footer />
      <StatusBar />
    </StatusProvider>
  );
}

import { trackOffset } from "@core/engine/layout";
import { type WordsState, charsFor } from "@core/engine/words";
import type { WarmUpSettings } from "@shared/settings";
import { memo, useRef } from "react";
import { useCaret } from "../hooks/useCaret";
import { Caret } from "./Caret";

interface WordsViewProps {
  state: WordsState;
  settings: WarmUpSettings;
  idle: boolean;
}

/** Visible lines of text; earlier lines scroll out of the way. */
const VISIBLE_LINES = 3;
const LINE_RATIO = 1.6;

export function WordsView({ state, settings, idle }: WordsViewProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const caret = useCaret(trackRef, state);

  // Whole pixels: a fractional line height makes every line boundary land on a
  // sub-pixel, which is exactly what makes the text look like it jitters.
  const lineHeight = Math.round(settings.fontSize * LINE_RATIO);
  // Keep the active word on the second line: the eye reads ahead, not behind.
  const offset = trackOffset(caret.top, caret.height, lineHeight);

  return (
    <div
      className="words-viewport"
      style={{
        height: lineHeight * VISIBLE_LINES,
        fontSize: settings.fontSize,
        lineHeight: `${lineHeight}px`,
      }}
    >
      <div className="words-track" ref={trackRef} style={{ transform: `translateY(${-offset}px)` }}>
        {state.words.map((word, index) => (
          <Word
            // Words repeat, so position is the only stable identity available.
            // biome-ignore lint/suspicious/noArrayIndexKey: positional by nature
            key={index}
            word={word}
            typed={state.typed[index] ?? ""}
            active={index === state.active}
            committed={index < state.active}
          />
        ))}
        <Caret
          position={caret}
          style={settings.caretStyle}
          smooth={settings.smoothCaret}
          blinking={idle}
        />
      </div>
    </div>
  );
}

interface WordProps {
  word: string;
  typed: string;
  active: boolean;
  committed: boolean;
}

const Word = memo(function Word({ word, typed, active, committed }: WordProps) {
  const chars = charsFor(word, typed, committed);
  const hasError = committed && chars.some((char) => char.state !== "correct");

  return (
    <span className={`word${active ? " word--active" : ""}${hasError ? " word--error" : ""}`}>
      {chars.map((char, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: positional by nature
          key={index}
          className={`char char--${char.state}`}
          data-typed={char.typed}
          data-caret={active && index === typed.length ? "before" : undefined}
        >
          {char.char}
        </span>
      ))}
      {active && typed.length >= chars.length && (
        <span className="char char--tail" data-caret="after">
          {"​"}
        </span>
      )}
    </span>
  );
});

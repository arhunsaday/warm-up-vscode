import type { CodeState } from "@core/engine/code";
import { trackOffset } from "@core/engine/layout";
import { type WordsState, charsFor } from "@core/engine/words";
import { type ReactNode, type RefObject, useRef } from "react";
import { type CaretPosition, useCaretPosition } from "../hooks/useCaretPosition";

const ZERO_WIDTH = "​";

interface WordsSurfaceProps {
  state: WordsState;
  /** `flow` wraps freely (the hero); `window` scrolls three lines at a time. */
  variant: "flow" | "window";
  lineHeight?: number;
  visibleLines?: number;
}

export function WordsSurface({
  state,
  variant,
  lineHeight = 44,
  visibleLines = 3,
}: WordsSurfaceProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const caret = useCaretPosition(trackRef, state);
  const offset = variant === "window" ? trackOffset(caret.top, caret.height, lineHeight) : 0;

  return (
    <div
      className={`surface surface--${variant}`}
      style={variant === "window" ? { height: lineHeight * visibleLines } : undefined}
    >
      <div
        className="surface__track"
        ref={trackRef}
        style={{ transform: `translateY(${-offset}px)` }}
      >
        {state.words.map((word, index) => {
          const typed = state.typed[index] ?? "";
          const active = index === state.active;
          const chars = charsFor(word, typed, index < state.active);

          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: positional by nature
            <span className="word" key={index}>
              {chars.map((char, charIndex) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: positional by nature
                  key={charIndex}
                  className={`ch ch--${char.state}`}
                  data-caret={active && charIndex === typed.length ? "before" : undefined}
                >
                  {char.char}
                </span>
              ))}
              {active && typed.length >= chars.length && (
                <span className="ch ch--tail" data-caret="after">
                  {ZERO_WIDTH}
                </span>
              )}
            </span>
          );
        })}
        <Caret position={caret} />
      </div>
    </div>
  );
}

interface Line {
  start: number;
  chars: { char: string; index: number }[];
}

function toLines(target: string): Line[] {
  const lines: Line[] = [];
  let current: Line = { start: 0, chars: [] };

  for (let index = 0; index < target.length; index += 1) {
    const char = target[index];
    current.chars.push({ char, index });
    if (char === "\n") {
      lines.push(current);
      current = { start: index + 1, chars: [] };
    }
  }
  lines.push(current);

  return lines;
}

export function CodeSurface({ state, classes }: { state: CodeState; classes: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const caret = useCaretPosition(trackRef, state);

  return (
    <div className="surface surface--code">
      <div className="surface__track" ref={trackRef}>
        {toLines(state.target).map((line, number) => (
          <div className="code-line" key={line.start}>
            <span className="code-line__number">{number + 1}</span>
            <span className="code-line__body">
              {line.chars.map(({ char, index }) => (
                <span
                  key={index}
                  className={[
                    "ch",
                    `ch--${state.states[index]}`,
                    char === "\n" && "ch--newline",
                    classes[index] ? `token ${classes[index]}` : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-caret={index === state.index ? "before" : undefined}
                >
                  {char === "\n" ? "↵" : char}
                </span>
              ))}
            </span>
          </div>
        ))}
        <Caret position={caret} />
      </div>
    </div>
  );
}

function Caret({ position }: { position: CaretPosition }) {
  if (!position.visible) {
    return null;
  }
  return (
    <span
      className="surface__caret"
      aria-hidden="true"
      style={{
        transform: `translate(${position.left}px, ${position.top}px)`,
        height: position.height,
      }}
    />
  );
}

interface TypingInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  onChar: (char: string) => void;
  onBackspace: (wholeWord: boolean) => void;
  onTab?: () => void;
  onRestart: () => void;
  onFocusChange: (focused: boolean) => void;
  label: string;
  /** Runs first; calling `preventDefault` suppresses the default handling. */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * The real input behind every surface. Text arrives through `input` rather than
 * `keydown` so dead keys and IME composition work, same as in the extension.
 */
export function TypingInput({
  inputRef,
  onChar,
  onBackspace,
  onTab,
  onRestart,
  onFocusChange,
  label,
  onKeyDown,
}: TypingInputProps): ReactNode {
  return (
    <input
      ref={inputRef}
      className="typing-input"
      type="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label={label}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onRestart();
        } else if (event.key === "Backspace") {
          event.preventDefault();
          onBackspace(event.ctrlKey || event.altKey || event.metaKey);
        } else if (event.key === "Enter") {
          event.preventDefault();
          onChar("\n");
        } else if (event.key === "Tab" && onTab) {
          event.preventDefault();
          onTab();
        }
      }}
      onInput={(event) => {
        const target = event.currentTarget;
        if ((event.nativeEvent as InputEvent).isComposing) {
          return;
        }
        const value = target.value;
        target.value = "";
        for (const char of value) {
          onChar(char);
        }
      }}
      onPaste={(event) => event.preventDefault()}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
    />
  );
}

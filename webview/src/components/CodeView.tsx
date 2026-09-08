import type { CodeState } from "@core/engine/code";
import type { WarmUpSettings } from "@shared/settings";
import { useEffect, useMemo, useRef } from "react";
import { useCaret } from "../hooks/useCaret";
import { Caret } from "./Caret";

interface CodeViewProps {
  state: CodeState;
  classes: string[];
  settings: WarmUpSettings;
  idle: boolean;
}

interface Line {
  start: number;
  chars: { char: string; index: number }[];
}

/** Splits the flat target into lines while keeping every global char index. */
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

export function CodeView({ state, classes, settings, idle }: CodeViewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const caret = useCaret(trackRef, state);
  const lines = useMemo(() => toLines(state.target), [state.target]);

  // Follow the caret without yanking the whole snippet around.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !caret.visible) {
      return;
    }

    const top = caret.top;
    const bottom = top + caret.height;
    const margin = caret.height * 2;

    if (bottom > viewport.scrollTop + viewport.clientHeight - margin) {
      viewport.scrollTop = bottom - viewport.clientHeight + margin;
    } else if (top < viewport.scrollTop + margin) {
      viewport.scrollTop = Math.max(0, top - margin);
    }
  }, [caret.top, caret.height, caret.visible]);

  return (
    <div className="code-viewport" ref={viewportRef} style={{ fontSize: settings.fontSize * 0.7 }}>
      <div className="code-track" ref={trackRef}>
        {lines.map((line) => (
          <div className="code-line" key={line.start}>
            {line.chars.map(({ char, index }) => {
              const charState = state.states[index];
              const isNewline = char === "\n";
              return (
                <span
                  key={index}
                  className={[
                    "char",
                    `char--${charState}`,
                    isNewline && "char--newline",
                    classes[index] ? `token ${classes[index]}` : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-typed={charState === "incorrect" ? state.typed[index] : undefined}
                  data-caret={index === state.index ? "before" : undefined}
                >
                  {isNewline ? "↵" : char}
                </span>
              );
            })}
            {line.chars.length === 0 && <span className="char char--tail">{"​"}</span>}
          </div>
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

import type { ZenState } from "@core/engine/zen";
import type { WarmUpSettings } from "@shared/settings";
import { useRef } from "react";
import { useCaret } from "../hooks/useCaret";
import { Caret } from "./Caret";

interface ZenViewProps {
  state: ZenState;
  settings: WarmUpSettings;
  idle: boolean;
}

const LINE_RATIO = 1.6;

/**
 * Free typing: there is no target, so the view simply shows what has been typed
 * and keeps the caret at the end.
 */
export function ZenView({ state, settings, idle }: ZenViewProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const caret = useCaret(trackRef, state);
  const lineHeight = Math.round(settings.fontSize * LINE_RATIO);

  return (
    <div
      className="zen-viewport"
      style={{ fontSize: settings.fontSize, lineHeight: `${lineHeight}px` }}
    >
      <div className="zen-track" ref={trackRef}>
        {state.typed.length === 0 ? (
          <span className="zen-placeholder">start typing anything…</span>
        ) : (
          <span className="zen-text">{state.typed}</span>
        )}
        <span className="char char--tail" data-caret="after">
          {"​"}
        </span>
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

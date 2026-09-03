import type { CaretStyle } from "../../../shared/settings";
import type { CaretPosition } from "../hooks/useCaret";

interface CaretProps {
  position: CaretPosition;
  style: CaretStyle;
  smooth: boolean;
  /** The caret only blinks while the user is idle, like a real editor. */
  blinking: boolean;
}

export function Caret({ position, style, smooth, blinking }: CaretProps) {
  if (style === "off" || !position.visible) {
    return null;
  }

  const className = [
    "caret",
    `caret--${style}`,
    smooth && "caret--smooth",
    blinking && "caret--blink",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        transform: `translate(${position.left}px, ${position.top}px)`,
        height: position.height,
        width: style === "line" ? undefined : position.width,
      }}
    />
  );
}

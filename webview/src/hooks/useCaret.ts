import { type RefObject, useLayoutEffect, useState } from "react";

export interface CaretPosition {
  left: number;
  top: number;
  height: number;
  width: number;
  visible: boolean;
}

const HIDDEN: CaretPosition = { left: 0, top: 0, height: 0, width: 0, visible: false };

/**
 * Positions the caret from the DOM rather than from character arithmetic, so it
 * stays correct with proportional fonts, wrapping, ligatures and zoom.
 *
 * The element to sit on is marked with `data-caret="before" | "after"`.
 */
export function useCaret(container: RefObject<HTMLElement | null>, key: unknown): CaretPosition {
  const [position, setPosition] = useState<CaretPosition>(HIDDEN);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` is the render digest.
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) {
      return;
    }

    const measure = () => {
      const target = element.querySelector<HTMLElement>("[data-caret]");
      if (!target) {
        setPosition(HIDDEN);
        return;
      }

      const parent = element.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const after = target.dataset.caret === "after";

      setPosition({
        left: rect.left - parent.left + (after ? rect.width : 0),
        top: rect.top - parent.top,
        height: rect.height,
        width: rect.width,
        visible: true,
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [container, key]);

  return position;
}

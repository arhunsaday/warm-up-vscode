/**
 * Vertical scrolling for the words view.
 *
 * The caret is measured from a character's bounding box, which sits inside the
 * line box by half the leading — so `caretTop` is a few pixels below the line it
 * belongs to. Subtracting a raw line height from it therefore produced an offset
 * that was off by that half-leading, and the whole text nudged upwards by a few
 * pixels the moment the caret reached the second line.
 *
 * Snapping to whole lines instead means the offset is always an exact multiple
 * of the line height: the text only ever moves by a full line, never by a few
 * stray pixels.
 */
export function lineIndexAt(caretTop: number, caretHeight: number, lineHeight: number): number {
  if (lineHeight <= 0) {
    return 0;
  }
  // The vertical centre of the character is unambiguously inside its own line.
  return Math.max(0, Math.floor((caretTop + caretHeight / 2) / lineHeight));
}

/**
 * How far to translate the text so the caret's line is the second visible one,
 * keeping a line of context above and the rest of the text below.
 */
export function trackOffset(
  caretTop: number,
  caretHeight: number,
  lineHeight: number,
  leadingLines = 1,
): number {
  const line = lineIndexAt(caretTop, caretHeight, lineHeight);
  return Math.max(0, (line - leadingLines) * lineHeight);
}

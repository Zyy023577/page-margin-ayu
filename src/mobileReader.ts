export type SwipeDirection = 'next' | 'prev' | null;

/**
 * Decide whether a touch is an intentional horizontal page swipe.
 * Small movements and mostly-vertical gestures are ignored so that selecting
 * text and scrolling the reader remain natural on phones.
 */
export function getSwipeDirection(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  threshold = 48,
  verticalSlop = 1.25,
): SwipeDirection {
  const dx = endX - startX;
  const dy = endY - startY;
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * verticalSlop) return null;
  return dx < 0 ? 'next' : 'prev';
}

export function getKeyboardInset(layoutHeight: number, visualHeight?: number, visualOffsetTop = 0): number {
  if (!visualHeight || !Number.isFinite(visualHeight)) return 0;
  return Math.max(0, Math.round(layoutHeight - visualHeight - visualOffsetTop));
}

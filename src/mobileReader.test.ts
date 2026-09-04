import { describe, expect, it } from 'vitest';
import { getKeyboardInset, getSwipeDirection } from './mobileReader';

describe('mobile reader gestures', () => {
  it('recognises deliberate left and right swipes', () => {
    expect(getSwipeDirection(220, 300, 130, 308)).toBe('next');
    expect(getSwipeDirection(130, 300, 220, 308)).toBe('prev');
  });

  it('ignores taps, short movements, and vertical scrolling', () => {
    expect(getSwipeDirection(100, 200, 120, 205)).toBeNull();
    expect(getSwipeDirection(100, 200, 155, 290)).toBeNull();
    expect(getSwipeDirection(100, 200, 145, 220)).toBeNull();
  });

  it('calculates the visual viewport inset used when the keyboard opens', () => {
    expect(getKeyboardInset(800, 500)).toBe(300);
    expect(getKeyboardInset(800, 500, 20)).toBe(280);
    expect(getKeyboardInset(800)).toBe(0);
  });
});

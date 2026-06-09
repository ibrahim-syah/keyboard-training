import type { KeyCombination, KeyState, MatchResult } from './types';

/**
 * Compares captured key state against the expected combination.
 *
 * Modifier comparison logic:
 * - KeyCombination uses simplified flags (ctrl, alt, shift, meta)
 * - KeyState uses left/right variants (ctrlLeft, ctrlRight, etc.)
 * - A modifier matches if either left OR right variant is pressed
 *   when expected is true, and neither is pressed when expected is false.
 */
export function match(expected: KeyCombination, actual: KeyState): MatchResult {
  const ctrlPressed = actual.modifiers.ctrlLeft || actual.modifiers.ctrlRight;
  const altPressed = actual.modifiers.altLeft || actual.modifiers.altRight;
  const shiftPressed = actual.modifiers.shiftLeft || actual.modifiers.shiftRight;
  const metaPressed = actual.modifiers.metaLeft || actual.modifiers.metaRight;

  const modifiersMatch =
    expected.modifiers.ctrl === ctrlPressed &&
    expected.modifiers.alt === altPressed &&
    expected.modifiers.shift === shiftPressed &&
    expected.modifiers.meta === metaPressed;

  const baseKeyMatch = expected.baseKey === actual.baseKey;

  return {
    correct: modifiersMatch && baseKeyMatch,
    expected,
    actual,
    timestamp: Date.now(),
  };
}

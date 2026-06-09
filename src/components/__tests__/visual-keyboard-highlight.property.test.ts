// Feature: modifier-key-trainer, Property 10: Keyboard highlight set matches combination constituents
// **Validates: Requirements 3.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { KeyCombination } from '../../domain/types';

/**
 * Computes the set of key IDs that should be highlighted on the visual keyboard
 * for a given KeyCombination. This mirrors the highlight logic used by the
 * VisualKeyboard component:
 * - Each modifier that is true maps to its left-variant key code
 * - The baseKey code is always included
 */
function getHighlightedKeysForCombination(combo: KeyCombination): string[] {
  const keys: string[] = [];

  if (combo.modifiers.ctrl) keys.push('ControlLeft');
  if (combo.modifiers.alt) keys.push('AltLeft');
  if (combo.modifiers.shift) keys.push('ShiftLeft');
  if (combo.modifiers.meta) keys.push('MetaLeft');

  keys.push(combo.baseKey);

  return keys;
}

/**
 * Arbitrary for generating valid event.code base key values.
 * These represent non-modifier keys that could appear in combinations.
 */
const baseKeyArb = fc.oneof(
  // Letter keys
  fc.constantFrom(
    'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH',
    'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP',
    'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX',
    'KeyY', 'KeyZ',
  ),
  // Digit keys
  fc.constantFrom(
    'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4',
    'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
  ),
  // Function keys
  fc.constantFrom(
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
    'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  ),
  // Navigation and other keys
  fc.constantFrom(
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Home', 'End', 'PageUp', 'PageDown',
    'Tab', 'Space', 'Enter', 'Backspace', 'Delete', 'Escape',
  ),
);

/**
 * Arbitrary for generating random KeyCombination objects.
 */
const keyCombinationArb: fc.Arbitrary<KeyCombination> = fc.record({
  modifiers: fc.record({
    ctrl: fc.boolean(),
    alt: fc.boolean(),
    shift: fc.boolean(),
    meta: fc.boolean(),
  }),
  baseKey: baseKeyArb,
});

describe('VisualKeyboard - Property 10: Keyboard highlight set matches combination constituents', () => {
  it('highlighted keys include ControlLeft if and only if ctrl modifier is true', () => {
    fc.assert(
      fc.property(keyCombinationArb, (combo) => {
        const highlighted = getHighlightedKeysForCombination(combo);

        if (combo.modifiers.ctrl) {
          expect(highlighted).toContain('ControlLeft');
        } else {
          expect(highlighted).not.toContain('ControlLeft');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('highlighted keys include AltLeft if and only if alt modifier is true', () => {
    fc.assert(
      fc.property(keyCombinationArb, (combo) => {
        const highlighted = getHighlightedKeysForCombination(combo);

        if (combo.modifiers.alt) {
          expect(highlighted).toContain('AltLeft');
        } else {
          expect(highlighted).not.toContain('AltLeft');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('highlighted keys include ShiftLeft if and only if shift modifier is true', () => {
    fc.assert(
      fc.property(keyCombinationArb, (combo) => {
        const highlighted = getHighlightedKeysForCombination(combo);

        if (combo.modifiers.shift) {
          expect(highlighted).toContain('ShiftLeft');
        } else {
          expect(highlighted).not.toContain('ShiftLeft');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('highlighted keys include MetaLeft if and only if meta modifier is true', () => {
    fc.assert(
      fc.property(keyCombinationArb, (combo) => {
        const highlighted = getHighlightedKeysForCombination(combo);

        if (combo.modifiers.meta) {
          expect(highlighted).toContain('MetaLeft');
        } else {
          expect(highlighted).not.toContain('MetaLeft');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('highlighted keys always include the baseKey', () => {
    fc.assert(
      fc.property(keyCombinationArb, (combo) => {
        const highlighted = getHighlightedKeysForCombination(combo);
        expect(highlighted).toContain(combo.baseKey);
      }),
      { numRuns: 100 },
    );
  });

  it('highlighted keys contain no extra keys beyond modifiers and baseKey', () => {
    fc.assert(
      fc.property(keyCombinationArb, (combo) => {
        const highlighted = getHighlightedKeysForCombination(combo);

        // Build the expected set
        const expected = new Set<string>();
        if (combo.modifiers.ctrl) expected.add('ControlLeft');
        if (combo.modifiers.alt) expected.add('AltLeft');
        if (combo.modifiers.shift) expected.add('ShiftLeft');
        if (combo.modifiers.meta) expected.add('MetaLeft');
        expected.add(combo.baseKey);

        // Verify exact match: same size and same elements
        const highlightedSet = new Set(highlighted);
        expect(highlightedSet.size).toBe(expected.size);
        for (const key of expected) {
          expect(highlightedSet.has(key)).toBe(true);
        }
        for (const key of highlightedSet) {
          expect(expected.has(key)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});

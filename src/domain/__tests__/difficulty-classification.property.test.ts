// Feature: modifier-key-trainer, Property 22: Difficulty level classification follows key count and modifier rules
// **Validates: Requirements 7.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { classifyLevel } from '../difficulty-manager';
import type { KeyCombination, ModifierSet } from '../types';

/**
 * Generate a random base key code from a realistic set of event.code values.
 */
const baseKeyArb = fc.oneof(
  fc.constantFrom(
    'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH',
    'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP',
    'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Tab', 'Space', 'Enter', 'Backspace', 'Delete',
  ),
);

/**
 * Generate a KeyCombination with no modifiers (single key only).
 */
const noModifierCombinationArb: fc.Arbitrary<KeyCombination> = baseKeyArb.map((baseKey) => ({
  modifiers: { ctrl: false, alt: false, shift: false, meta: false },
  baseKey,
}));

/**
 * Generate a KeyCombination with exactly one modifier that is meta or shift (2 keys total → Level 1).
 */
const level1CombinationArb: fc.Arbitrary<KeyCombination> = fc.tuple(
  fc.constantFrom('meta', 'shift' as const),
  baseKeyArb,
).map(([mod, baseKey]) => ({
  modifiers: {
    ctrl: false,
    alt: false,
    shift: mod === 'shift',
    meta: mod === 'meta',
  },
  baseKey,
}));

/**
 * Generate a KeyCombination with exactly one modifier that is ctrl or alt (2 keys total → Level 2).
 */
const level2CombinationArb: fc.Arbitrary<KeyCombination> = fc.tuple(
  fc.constantFrom('ctrl', 'alt' as const),
  baseKeyArb,
).map(([mod, baseKey]) => ({
  modifiers: {
    ctrl: mod === 'ctrl',
    alt: mod === 'alt',
    shift: false,
    meta: false,
  },
  baseKey,
}));

/**
 * Generate a KeyCombination with exactly 2 modifiers (3 keys total → Level 3).
 */
const level3CombinationArb: fc.Arbitrary<KeyCombination> = fc.tuple(
  fc.subarray(['ctrl', 'alt', 'shift', 'meta'] as const, { minLength: 2, maxLength: 2 }),
  baseKeyArb,
).map(([mods, baseKey]) => ({
  modifiers: {
    ctrl: mods.includes('ctrl'),
    alt: mods.includes('alt'),
    shift: mods.includes('shift'),
    meta: mods.includes('meta'),
  },
  baseKey,
}));

/**
 * Generate a KeyCombination with exactly 3 modifiers (4 keys total → Level 4).
 */
const level4CombinationArb: fc.Arbitrary<KeyCombination> = fc.tuple(
  fc.subarray(['ctrl', 'alt', 'shift', 'meta'] as const, { minLength: 3, maxLength: 3 }),
  baseKeyArb,
).map(([mods, baseKey]) => ({
  modifiers: {
    ctrl: mods.includes('ctrl'),
    alt: mods.includes('alt'),
    shift: mods.includes('shift'),
    meta: mods.includes('meta'),
  },
  baseKey,
}));

/**
 * Generate a random KeyCombination with any number of modifiers (0 to 4).
 */
const randomCombinationArb: fc.Arbitrary<KeyCombination> = fc.tuple(
  fc.boolean(),
  fc.boolean(),
  fc.boolean(),
  fc.boolean(),
  baseKeyArb,
).map(([ctrl, alt, shift, meta, baseKey]) => ({
  modifiers: { ctrl, alt, shift, meta },
  baseKey,
}));

describe('Difficulty Manager - Property 22: Difficulty level classification follows key count and modifier rules', () => {
  it('single key (no modifiers) returns null', () => {
    fc.assert(
      fc.property(
        noModifierCombinationArb,
        (combination) => {
          const level = classifyLevel(combination);
          expect(level).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('2-key combination with meta or shift modifier returns Level 1', () => {
    fc.assert(
      fc.property(
        level1CombinationArb,
        (combination) => {
          const level = classifyLevel(combination);
          expect(level).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('2-key combination with ctrl or alt modifier returns Level 2', () => {
    fc.assert(
      fc.property(
        level2CombinationArb,
        (combination) => {
          const level = classifyLevel(combination);
          expect(level).toBe(2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('3-key combination (2 modifiers + base) returns Level 3', () => {
    fc.assert(
      fc.property(
        level3CombinationArb,
        (combination) => {
          const level = classifyLevel(combination);
          expect(level).toBe(3);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('4-key combination (3 modifiers + base) returns Level 4', () => {
    fc.assert(
      fc.property(
        level4CombinationArb,
        (combination) => {
          const level = classifyLevel(combination);
          expect(level).toBe(4);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('random combinations are classified correctly based on total key count and modifier type', () => {
    fc.assert(
      fc.property(
        randomCombinationArb,
        (combination) => {
          const { ctrl, alt, shift, meta } = combination.modifiers;
          const modCount = [ctrl, alt, shift, meta].filter(Boolean).length;
          const totalKeys = modCount + 1; // modifiers + base key

          const level = classifyLevel(combination);

          if (totalKeys === 1) {
            expect(level).toBeNull();
          } else if (totalKeys === 2) {
            if (meta || shift) {
              expect(level).toBe(1);
            } else {
              expect(level).toBe(2);
            }
          } else if (totalKeys === 3) {
            expect(level).toBe(3);
          } else if (totalKeys >= 4) {
            expect(level).toBe(4);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: modifier-key-trainer, Property 8: Display formatting follows macOS conventions and canonical order
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatKeyCombination } from '../key-display';
import type { KeyCombination } from '../types';

/**
 * Validates: Requirements 3.2, 8.1, 8.5
 *
 * Property 8: Display formatting follows macOS conventions and canonical order
 * For any KeyCombination, the formatted display string SHALL:
 * (a) use macOS symbols (⌃ for Ctrl, ⌥ for Alt/Option, ⇧ for Shift, ⌘ for Cmd),
 * (b) order modifiers left-to-right as ⌃ → ⌥ → ⇧ → ⌘ → base key, and
 * (c) include the Fn/Globe symbol if and only if the base key is F1–F12.
 */

// Pool of valid base key codes
const BASE_KEY_CODES = [
  // Letter keys
  'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH',
  'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP',
  'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX',
  'KeyY', 'KeyZ',
  // Digit keys
  'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4',
  'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
  // Function keys
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  // Navigation / special keys
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'Tab', 'Enter', 'Backspace', 'Delete',
  'Home', 'End', 'PageUp', 'PageDown', 'Escape',
];

const FUNCTION_KEYS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];

// Arbitrary for generating KeyCombination objects
const keyCombinationArb: fc.Arbitrary<KeyCombination> = fc.record({
  modifiers: fc.record({
    ctrl: fc.boolean(),
    alt: fc.boolean(),
    shift: fc.boolean(),
    meta: fc.boolean(),
  }),
  baseKey: fc.constantFrom(...BASE_KEY_CODES),
});

describe('Property 8: Display formatting follows macOS conventions and canonical order', () => {
  it('uses correct macOS modifier symbols', () => {
    fc.assert(
      fc.property(keyCombinationArb, (combination) => {
        const result = formatKeyCombination(combination);

        if (combination.modifiers.ctrl) {
          expect(result).toContain('⌃');
        }
        if (combination.modifiers.alt) {
          expect(result).toContain('⌥');
        }
        if (combination.modifiers.shift) {
          expect(result).toContain('⇧');
        }
        if (combination.modifiers.meta) {
          expect(result).toContain('⌘');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('orders modifiers in canonical order: ⌃ before ⌥ before ⇧ before ⌘', () => {
    fc.assert(
      fc.property(keyCombinationArb, (combination) => {
        const result = formatKeyCombination(combination);

        const ctrlIdx = result.indexOf('⌃');
        const altIdx = result.indexOf('⌥');
        const shiftIdx = result.indexOf('⇧');
        const metaIdx = result.indexOf('⌘');

        // If both are present, the first must appear before the second
        if (ctrlIdx !== -1 && altIdx !== -1) {
          expect(ctrlIdx).toBeLessThan(altIdx);
        }
        if (ctrlIdx !== -1 && shiftIdx !== -1) {
          expect(ctrlIdx).toBeLessThan(shiftIdx);
        }
        if (ctrlIdx !== -1 && metaIdx !== -1) {
          expect(ctrlIdx).toBeLessThan(metaIdx);
        }
        if (altIdx !== -1 && shiftIdx !== -1) {
          expect(altIdx).toBeLessThan(shiftIdx);
        }
        if (altIdx !== -1 && metaIdx !== -1) {
          expect(altIdx).toBeLessThan(metaIdx);
        }
        if (shiftIdx !== -1 && metaIdx !== -1) {
          expect(shiftIdx).toBeLessThan(metaIdx);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('includes "Fn " if and only if baseKey is F1-F12', () => {
    fc.assert(
      fc.property(keyCombinationArb, (combination) => {
        const result = formatKeyCombination(combination);
        const isFunctionKey = FUNCTION_KEYS.includes(combination.baseKey);

        if (isFunctionKey) {
          expect(result).toContain('Fn ');
        } else {
          expect(result).not.toContain('Fn ');
        }
      }),
      { numRuns: 100 },
    );
  });
});

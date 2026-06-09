// Feature: modifier-key-trainer, Property 19: Custom training set JSON export/import round-trip
// **Validates: Requirements 6.3**

/**
 * @vitest-environment jsdom
 */

// Polyfill localStorage for jsdom environments (jsdom 29 + Node 26 doesn't expose it)
function createLocalStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createLocalStorageMock(),
    configurable: true,
    writable: true,
  });
}

import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { create, exportToJSON, importFromJSON } from '../custom-set-manager';

/**
 * Valid base key codes recognized by the custom-set-manager.
 * Subset used for generation (excludes modifier codes to keep combinations meaningful).
 */
const VALID_BASE_KEY_CODES = [
  // Letters KeyA-KeyZ
  'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG',
  'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN',
  'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU',
  'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ',
  // Digits Digit0-Digit9
  'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4',
  'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
  // Function keys F1-F12
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  // Arrow keys
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  // Special keys
  'Space', 'Enter', 'Tab', 'Escape', 'Backspace', 'Delete',
  'Home', 'End', 'PageUp', 'PageDown',
];

/**
 * Arbitrary for a valid set name: 1-50 printable chars, no leading/trailing whitespace.
 * Uses printable ASCII characters (0x21-0x7E) to avoid whitespace-only strings.
 */
const validNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .map((s) => s.trim())
  .filter((s) => s.length >= 1 && s.length <= 50);

/**
 * Arbitrary for a single KeyCombination with valid key codes.
 */
const keyCombinationArb = fc.record({
  modifiers: fc.record({
    ctrl: fc.boolean(),
    alt: fc.boolean(),
    shift: fc.boolean(),
    meta: fc.boolean(),
  }),
  baseKey: fc.constantFrom(...VALID_BASE_KEY_CODES),
});

/**
 * Arbitrary for a valid array of 5-20 key combinations.
 */
const combinationsArb = fc.array(keyCombinationArb, { minLength: 5, maxLength: 20 });

describe('Custom Set Manager - Property 19: Custom training set JSON export/import round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should preserve name and combinations through export/import round-trip', () => {
    fc.assert(
      fc.property(validNameArb, combinationsArb, (name, combinations) => {
        // Clear storage for this iteration
        localStorage.clear();

        // Step 1: Create the set
        const created = create(name, combinations);

        // Step 2: Export to JSON
        const json = exportToJSON(created.id);

        // Step 3: Clear storage to simulate a fresh state
        localStorage.clear();

        // Step 4: Import from JSON
        const imported = importFromJSON(json);

        // Step 5: Verify name is preserved
        if (imported.name !== created.name) {
          throw new Error(
            `Name mismatch: expected "${created.name}", got "${imported.name}"`,
          );
        }

        // Step 6: Verify combinations length matches
        if (imported.combinations.length !== created.combinations.length) {
          throw new Error(
            `Combinations length mismatch: expected ${created.combinations.length}, got ${imported.combinations.length}`,
          );
        }

        // Step 7: Verify each combination is equivalent
        for (let i = 0; i < created.combinations.length; i++) {
          const original = created.combinations[i];
          const restored = imported.combinations[i];

          if (restored.baseKey !== original.baseKey) {
            throw new Error(
              `Combination[${i}] baseKey mismatch: expected "${original.baseKey}", got "${restored.baseKey}"`,
            );
          }

          if (restored.modifiers.ctrl !== original.modifiers.ctrl) {
            throw new Error(
              `Combination[${i}] modifiers.ctrl mismatch: expected ${original.modifiers.ctrl}, got ${restored.modifiers.ctrl}`,
            );
          }
          if (restored.modifiers.alt !== original.modifiers.alt) {
            throw new Error(
              `Combination[${i}] modifiers.alt mismatch: expected ${original.modifiers.alt}, got ${restored.modifiers.alt}`,
            );
          }
          if (restored.modifiers.shift !== original.modifiers.shift) {
            throw new Error(
              `Combination[${i}] modifiers.shift mismatch: expected ${original.modifiers.shift}, got ${restored.modifiers.shift}`,
            );
          }
          if (restored.modifiers.meta !== original.modifiers.meta) {
            throw new Error(
              `Combination[${i}] modifiers.meta mismatch: expected ${original.modifiers.meta}, got ${restored.modifiers.meta}`,
            );
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

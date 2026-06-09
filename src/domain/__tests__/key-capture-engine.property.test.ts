// Feature: modifier-key-trainer, Property 1: Key state extraction preserves all event information
// **Validates: Requirements 1.1, 1.3**

import { describe, it, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createKeyCaptureEngine } from '../key-capture-engine';
import type { KeyState } from '../types';

/**
 * Non-modifier key codes that can be used as base keys.
 */
const NON_MODIFIER_CODES = [
  'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH',
  'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP',
  'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX',
  'KeyY', 'KeyZ', 'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4',
  'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'F1', 'F2',
  'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Space', 'Enter', 'Escape', 'Backspace', 'Tab', 'ArrowUp',
  'ArrowDown', 'ArrowLeft', 'ArrowRight',
];

/**
 * Modifier codes mapped to their corresponding KeyState modifier field names.
 */
const MODIFIER_CODE_MAP: Array<{ code: string; field: keyof KeyState['modifiers'] }> = [
  { code: 'ControlLeft', field: 'ctrlLeft' },
  { code: 'ControlRight', field: 'ctrlRight' },
  { code: 'AltLeft', field: 'altLeft' },
  { code: 'AltRight', field: 'altRight' },
  { code: 'ShiftLeft', field: 'shiftLeft' },
  { code: 'ShiftRight', field: 'shiftRight' },
  { code: 'MetaLeft', field: 'metaLeft' },
  { code: 'MetaRight', field: 'metaRight' },
];

/**
 * Arbitrary for generating random modifier flag combinations.
 */
const modifierFlagsArb = fc.record({
  ctrlLeft: fc.boolean(),
  ctrlRight: fc.boolean(),
  altLeft: fc.boolean(),
  altRight: fc.boolean(),
  shiftLeft: fc.boolean(),
  shiftRight: fc.boolean(),
  metaLeft: fc.boolean(),
  metaRight: fc.boolean(),
});

/**
 * Arbitrary for generating a random non-modifier event.code value.
 */
const baseKeyCodeArb = fc.constantFrom(...NON_MODIFIER_CODES);

describe('Key Capture Engine - Property 1: Key state extraction preserves all event information', () => {
  let engine: ReturnType<typeof createKeyCaptureEngine>;

  afterEach(() => {
    if (engine) {
      engine.disable();
    }
  });

  it('should produce a KeyState that exactly reflects all held modifiers with left/right distinction', () => {
    fc.assert(
      fc.property(modifierFlagsArb, baseKeyCodeArb, (modifiers, baseKeyCode) => {
        // Create a fresh engine for each test run
        engine = createKeyCaptureEngine();
        engine.enable(true);

        let capturedState: KeyState | null = null;
        const unsubscribe = engine.onKeyCombination((state) => {
          capturedState = state;
        });

        // Press modifier keys that should be held
        for (const { code, field } of MODIFIER_CODE_MAP) {
          if (modifiers[field]) {
            const modKeyEvent = new KeyboardEvent('keydown', {
              code,
              bubbles: true,
              cancelable: true,
              ctrlKey: modifiers.ctrlLeft || modifiers.ctrlRight,
              altKey: modifiers.altLeft || modifiers.altRight,
              shiftKey: modifiers.shiftLeft || modifiers.shiftRight,
              metaKey: modifiers.metaLeft || modifiers.metaRight,
            });
            window.dispatchEvent(modKeyEvent);
          }
        }

        // Press the base key to trigger the combination callback
        const baseKeyEvent = new KeyboardEvent('keydown', {
          code: baseKeyCode,
          bubbles: true,
          cancelable: true,
          ctrlKey: modifiers.ctrlLeft || modifiers.ctrlRight,
          altKey: modifiers.altLeft || modifiers.altRight,
          shiftKey: modifiers.shiftLeft || modifiers.shiftRight,
          metaKey: modifiers.metaLeft || modifiers.metaRight,
        });
        window.dispatchEvent(baseKeyEvent);

        // Verify the callback was fired
        if (capturedState === null) {
          throw new Error('onKeyCombination callback was not fired');
        }

        // Verify each modifier flag is correctly reflected in the KeyState
        for (const { field } of MODIFIER_CODE_MAP) {
          if (capturedState.modifiers[field] !== modifiers[field]) {
            throw new Error(
              `Modifier ${field}: expected ${modifiers[field]}, got ${capturedState.modifiers[field]}`
            );
          }
        }

        // Verify the base key is correctly captured
        if (capturedState.baseKey !== baseKeyCode) {
          throw new Error(
            `Base key: expected "${baseKeyCode}", got "${capturedState.baseKey}"`
          );
        }

        // Cleanup for this iteration
        unsubscribe();
        engine.disable();
      }),
      { numRuns: 100 }
    );
  });
});

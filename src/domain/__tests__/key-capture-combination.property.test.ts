// Feature: modifier-key-trainer, Property 4: Combination completion requires all modifiers held plus base key

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { createKeyCaptureEngine } from '../key-capture-engine';
import type { KeyState } from '../types';

/**
 * Validates: Requirements 1.7
 *
 * Property 4: Combination completion requires all modifiers held plus base key
 * For any target KeyCombination and any sequence of keydown/keyup events,
 * the Key Capture Engine SHALL report the combination as complete if and only if
 * the base key's keydown fires while all required modifier keys are currently held down.
 */

// Available modifier codes for generation
const MODIFIER_CODES = ['ControlLeft', 'AltLeft', 'ShiftLeft', 'MetaLeft'] as const;
type ModifierCode = (typeof MODIFIER_CODES)[number];

// Map from modifier code to the corresponding KeyState modifier field
const CODE_TO_MODIFIER_FIELD: Record<ModifierCode, keyof KeyState['modifiers']> = {
  ControlLeft: 'ctrlLeft',
  AltLeft: 'altLeft',
  ShiftLeft: 'shiftLeft',
  MetaLeft: 'metaLeft',
};

// Non-modifier base key codes for generation
const BASE_KEY_CODES = [
  'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH',
  'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP',
  'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX',
  'KeyY', 'KeyZ', 'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4',
  'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'F1', 'F2',
  'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Space', 'Enter', 'Tab', 'Backspace', 'ArrowUp', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
];

/**
 * Creates a synthetic KeyboardEvent-like object for dispatching.
 */
function createKeyboardEvent(
  type: 'keydown' | 'keyup',
  code: string,
  options?: { repeat?: boolean }
): KeyboardEvent {
  return new KeyboardEvent(type, {
    code,
    key: code,
    repeat: options?.repeat ?? false,
    bubbles: true,
    cancelable: true,
  });
}

// Arbitraries
const modifierSubsetArb = fc.subarray([...MODIFIER_CODES], { minLength: 1 });
const baseKeyArb = fc.constantFrom(...BASE_KEY_CODES);

describe('Property 4: Combination completion requires all modifiers held plus base key', () => {
  let engine: ReturnType<typeof createKeyCaptureEngine>;

  beforeEach(() => {
    engine = createKeyCaptureEngine();
  });

  afterEach(() => {
    engine.disable();
  });

  it('fires callback exactly once when base key pressed while all modifiers are held', () => {
    fc.assert(
      fc.property(modifierSubsetArb, baseKeyArb, (modifiers, baseKey) => {
        // Reset engine for each run
        engine.disable();
        engine = createKeyCaptureEngine();
        engine.enable(true);

        const results: KeyState[] = [];
        const unsubscribe = engine.onKeyCombination((state) => {
          results.push(state);
        });

        // Press each modifier key down (should NOT fire callback)
        for (const modCode of modifiers) {
          const event = createKeyboardEvent('keydown', modCode);
          window.dispatchEvent(event);
        }

        // At this point, no callback should have fired (only modifiers pressed)
        expect(results.length).toBe(0);

        // Press the base key (should fire callback exactly once)
        const baseEvent = createKeyboardEvent('keydown', baseKey);
        window.dispatchEvent(baseEvent);

        // Callback should have fired exactly once
        expect(results.length).toBe(1);

        // Verify the KeyState has all modifiers set to true
        const state = results[0];
        for (const modCode of modifiers) {
          const field = CODE_TO_MODIFIER_FIELD[modCode];
          expect(state.modifiers[field]).toBe(true);
        }

        // Verify the base key is correct
        expect(state.baseKey).toBe(baseKey);

        // Cleanup
        unsubscribe();

        // Release all keys
        for (const modCode of modifiers) {
          window.dispatchEvent(createKeyboardEvent('keyup', modCode));
        }
        window.dispatchEvent(createKeyboardEvent('keyup', baseKey));
      }),
      { numRuns: 100 }
    );
  });

  it('fires callback with different modifier state when base key pressed WITHOUT all required modifiers', () => {
    fc.assert(
      fc.property(
        modifierSubsetArb.filter((mods) => mods.length >= 2),
        baseKeyArb,
        (modifiers, baseKey) => {
          // Reset engine for each run
          engine.disable();
          engine = createKeyCaptureEngine();
          engine.enable(true);

          const results: KeyState[] = [];
          const unsubscribe = engine.onKeyCombination((state) => {
            results.push(state);
          });

          // Only press a strict subset of the required modifiers (omit the last one)
          const partialModifiers = modifiers.slice(0, modifiers.length - 1);
          const missingModifier = modifiers[modifiers.length - 1];

          for (const modCode of partialModifiers) {
            const event = createKeyboardEvent('keydown', modCode);
            window.dispatchEvent(event);
          }

          // Press the base key (callback fires but with incomplete modifiers)
          const baseEvent = createKeyboardEvent('keydown', baseKey);
          window.dispatchEvent(baseEvent);

          // Callback fires (engine fires on any base key press)
          expect(results.length).toBe(1);

          // The missing modifier should NOT be set to true
          const state = results[0];
          const missingField = CODE_TO_MODIFIER_FIELD[missingModifier];
          expect(state.modifiers[missingField]).toBe(false);

          // The held modifiers should be true
          for (const modCode of partialModifiers) {
            const field = CODE_TO_MODIFIER_FIELD[modCode];
            expect(state.modifiers[field]).toBe(true);
          }

          // Base key should still be correct
          expect(state.baseKey).toBe(baseKey);

          // Cleanup
          unsubscribe();
          for (const modCode of partialModifiers) {
            window.dispatchEvent(createKeyboardEvent('keyup', modCode));
          }
          window.dispatchEvent(createKeyboardEvent('keyup', baseKey));
        }
      ),
      { numRuns: 100 }
    );
  });
});

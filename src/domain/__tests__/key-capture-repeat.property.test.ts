// Feature: modifier-key-trainer, Property 3: Repeat events are always ignored
// **Validates: Requirements 1.6**

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createKeyCaptureEngine } from '../key-capture-engine';

/**
 * Arbitrary for generating random event.code values representing
 * both modifier keys and non-modifier keys.
 */
const arbitraryEventCode = fc.oneof(
  // Modifier codes
  fc.constantFrom(
    'ControlLeft',
    'ControlRight',
    'AltLeft',
    'AltRight',
    'ShiftLeft',
    'ShiftRight',
    'MetaLeft',
    'MetaRight'
  ),
  // Common non-modifier codes
  fc.constantFrom(
    'KeyA',
    'KeyB',
    'KeyC',
    'KeyD',
    'KeyE',
    'KeyF',
    'KeyG',
    'KeyH',
    'KeyI',
    'KeyJ',
    'KeyK',
    'KeyL',
    'KeyM',
    'KeyN',
    'KeyO',
    'KeyP',
    'KeyQ',
    'KeyR',
    'KeyS',
    'KeyT',
    'KeyU',
    'KeyV',
    'KeyW',
    'KeyX',
    'KeyY',
    'KeyZ',
    'Digit0',
    'Digit1',
    'Digit2',
    'Digit3',
    'Digit4',
    'Digit5',
    'Digit6',
    'Digit7',
    'Digit8',
    'Digit9',
    'F1',
    'F2',
    'F3',
    'F4',
    'F5',
    'F6',
    'F7',
    'F8',
    'F9',
    'F10',
    'F11',
    'F12',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Space',
    'Enter',
    'Tab',
    'Backspace',
    'Escape'
  )
);

/**
 * Arbitrary for random modifier state (boolean flags on the event).
 */
const arbitraryModifierState = fc.record({
  ctrlKey: fc.boolean(),
  shiftKey: fc.boolean(),
  altKey: fc.boolean(),
  metaKey: fc.boolean(),
});

describe('Key Capture Engine - Property 3: Repeat events are always ignored', () => {
  afterEach(() => {
    // Clean up any lingering event listeners
  });

  it('onKeyCombination never fires for events with repeat=true', () => {
    fc.assert(
      fc.property(
        arbitraryEventCode,
        arbitraryModifierState,
        fc.boolean(), // exerciseActive flag
        (code, modifiers, exerciseActive) => {
          const engine = createKeyCaptureEngine();
          const callback = vi.fn();

          engine.onKeyCombination(callback);
          engine.enable(exerciseActive);

          // Dispatch a keydown event with repeat=true
          const event = new KeyboardEvent('keydown', {
            code,
            repeat: true,
            ctrlKey: modifiers.ctrlKey,
            shiftKey: modifiers.shiftKey,
            altKey: modifiers.altKey,
            metaKey: modifiers.metaKey,
            bubbles: true,
            cancelable: true,
          });

          window.dispatchEvent(event);

          // The callback should NEVER be called for repeat events
          expect(callback).not.toHaveBeenCalled();

          // Clean up
          engine.disable();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('onKeyCombination never fires even after multiple repeat events in sequence', () => {
    fc.assert(
      fc.property(
        arbitraryEventCode,
        arbitraryModifierState,
        fc.integer({ min: 2, max: 10 }), // number of repeat events
        (code, modifiers, repeatCount) => {
          const engine = createKeyCaptureEngine();
          const callback = vi.fn();

          engine.onKeyCombination(callback);
          engine.enable(true);

          // Dispatch multiple repeat events in sequence
          for (let i = 0; i < repeatCount; i++) {
            const event = new KeyboardEvent('keydown', {
              code,
              repeat: true,
              ctrlKey: modifiers.ctrlKey,
              shiftKey: modifiers.shiftKey,
              altKey: modifiers.altKey,
              metaKey: modifiers.metaKey,
              bubbles: true,
              cancelable: true,
            });
            window.dispatchEvent(event);
          }

          // The callback should still NEVER be called
          expect(callback).not.toHaveBeenCalled();

          // Clean up
          engine.disable();
        }
      ),
      { numRuns: 100 }
    );
  });
});

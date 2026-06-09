// Feature: modifier-key-trainer, Property 2: preventDefault is called if and only if exercise is active

import { describe, it, afterEach } from 'vitest';
import fc from 'fast-check';
import { createKeyCaptureEngine } from '../key-capture-engine';

/**
 * Property 2: preventDefault is called if and only if exercise is active
 *
 * For any keydown event, preventDefault SHALL be called if and only if
 * an Exercise is currently active. When no Exercise is active, the event
 * SHALL pass through unmodified.
 *
 * Validates: Requirements 1.2
 */

// Arbitrary for generating random event.code values
const eventCodeArb = fc.oneof(
  fc.constantFrom(
    'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG',
    'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN',
    'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU',
    'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ',
    'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4',
    'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'Space', 'Enter', 'Tab', 'Escape', 'Backspace',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
    'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'
  )
);

describe('Property 2: preventDefault is called if and only if exercise is active', () => {
  let engine: ReturnType<typeof createKeyCaptureEngine>;

  afterEach(() => {
    if (engine) {
      engine.disable();
    }
  });

  it('should call preventDefault when exerciseActive is true, and not call it when false', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        eventCodeArb,
        (exerciseActive: boolean, code: string) => {
          engine = createKeyCaptureEngine();
          engine.enable(exerciseActive);

          const event = new KeyboardEvent('keydown', {
            code,
            cancelable: true,
          });

          window.dispatchEvent(event);

          // preventDefault is called iff exerciseActive is true
          if (exerciseActive) {
            if (!event.defaultPrevented) {
              return false; // Should have been prevented
            }
          } else {
            if (event.defaultPrevented) {
              return false; // Should NOT have been prevented
            }
          }

          engine.disable();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not call preventDefault when engine is disabled', () => {
    fc.assert(
      fc.property(
        eventCodeArb,
        (code: string) => {
          engine = createKeyCaptureEngine();
          // Enable then disable
          engine.enable(true);
          engine.disable();

          const event = new KeyboardEvent('keydown', {
            code,
            cancelable: true,
          });

          window.dispatchEvent(event);

          // After disabling, events should pass through unmodified
          return !event.defaultPrevented;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: modifier-key-trainer, Property 9: Incorrect input preserves the current prompt
// **Validates: Requirements 3.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ExerciseController } from '../exercise-controller';
import type { ExerciseConfig, KeyCombination, KeyState } from '../types';

/**
 * The known prompt we'll use for the exercise: Cmd+C
 * modifiers: meta=true, others false; baseKey: 'KeyC'
 */
const CMD_C_PROMPT: KeyCombination = {
  modifiers: { ctrl: false, alt: false, shift: false, meta: true },
  baseKey: 'KeyC',
};

/**
 * Create an ExerciseConfig with CMD_C as the only prompt (repeated to fill 10 minimum).
 */
function makeConfig(): ExerciseConfig {
  const prompts: KeyCombination[] = Array.from({ length: 10 }, () => CMD_C_PROMPT);
  return {
    category: 'combinations',
    promptCount: 10,
    prompts,
  };
}

/**
 * Arbitrary that generates a baseKey string guaranteed to NOT be 'KeyC'.
 * Uses common event.code values excluding 'KeyC'.
 */
const nonMatchingBaseKeyArb = fc.constantFrom(
  'KeyA', 'KeyB', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI',
  'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ',
  'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY',
  'KeyZ', 'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
  'Digit6', 'Digit7', 'Digit8', 'Digit9', 'F1', 'F2', 'F3', 'F4',
  'Space', 'Enter', 'Tab', 'ArrowUp', 'ArrowDown',
);

/**
 * Arbitrary that generates a KeyState with a baseKey that is NOT 'KeyC',
 * guaranteeing the input will never match the CMD_C prompt.
 * Modifier flags are randomized for thorough coverage.
 */
const wrongKeyStateArb: fc.Arbitrary<KeyState> = fc.record({
  modifiers: fc.record({
    ctrlLeft: fc.boolean(),
    ctrlRight: fc.boolean(),
    altLeft: fc.boolean(),
    altRight: fc.boolean(),
    shiftLeft: fc.boolean(),
    shiftRight: fc.boolean(),
    metaLeft: fc.boolean(),
    metaRight: fc.boolean(),
  }),
  baseKey: nonMatchingBaseKeyArb,
});

describe('Exercise Controller - Property 9: Incorrect input preserves the current prompt', () => {
  it('should keep currentPromptIndex unchanged when input does not match current prompt', () => {
    fc.assert(
      fc.property(
        wrongKeyStateArb,
        (wrongState) => {
          const controller = new ExerciseController();
          controller.start(makeConfig());

          // Verify initial state
          const stateBefore = controller.getState();
          expect(stateBefore.currentPromptIndex).toBe(0);
          expect(stateBefore.status).toBe('active');

          // Apply incorrect input
          controller.handleInput(wrongState);

          // Verify prompt index is still 0 (unchanged)
          const stateAfter = controller.getState();
          expect(stateAfter.currentPromptIndex).toBe(0);
          expect(stateAfter.status).toBe('active');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should maintain active status after multiple incorrect inputs', () => {
    fc.assert(
      fc.property(
        fc.array(wrongKeyStateArb, { minLength: 1, maxLength: 10 }),
        (wrongStates) => {
          const controller = new ExerciseController();
          controller.start(makeConfig());

          // Apply multiple incorrect inputs
          for (const wrongState of wrongStates) {
            controller.handleInput(wrongState);
          }

          // Verify prompt index is still 0 and status remains active
          const stateAfter = controller.getState();
          expect(stateAfter.currentPromptIndex).toBe(0);
          expect(stateAfter.status).toBe('active');
        },
      ),
      { numRuns: 100 },
    );
  });
});

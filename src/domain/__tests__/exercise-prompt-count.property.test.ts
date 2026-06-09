// Feature: modifier-key-trainer, Property 7: Exercise prompt count is bounded to [10, 50]
// **Validates: Requirements 2.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ExerciseController } from '../exercise-controller';
import type { ExerciseConfig, KeyCombination } from '../types';

/**
 * Generate a dummy KeyCombination for padding the prompts array.
 */
function makeDummyPrompt(index: number): KeyCombination {
  return {
    modifiers: { ctrl: false, alt: false, shift: false, meta: false },
    baseKey: `Key${String.fromCharCode(65 + (index % 26))}`,
  };
}

/**
 * Generate an array of 60 dummy prompts (more than the max of 50)
 * so that the controller always has enough prompts to draw from.
 */
function makeDummyPrompts(count: number = 60): KeyCombination[] {
  return Array.from({ length: count }, (_, i) => makeDummyPrompt(i));
}

describe('Exercise Controller - Property 7: Exercise prompt count is bounded to [10, 50]', () => {
  it('should clamp promptCount to [10, 50] for any integer input', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 200 }),
        (promptCount) => {
          const controller = new ExerciseController();
          const prompts = makeDummyPrompts(60);

          const config: ExerciseConfig = {
            category: 'modifiers',
            promptCount,
            prompts,
          };

          controller.start(config);
          const state = controller.getState();

          // totalPrompts must always be within [10, 50]
          expect(state.totalPrompts).toBeGreaterThanOrEqual(10);
          expect(state.totalPrompts).toBeLessThanOrEqual(50);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should clamp values below 10 to exactly 10', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 9 }),
        (promptCount) => {
          const controller = new ExerciseController();
          const prompts = makeDummyPrompts(60);

          const config: ExerciseConfig = {
            category: 'numbers',
            promptCount,
            prompts,
          };

          controller.start(config);
          const state = controller.getState();

          expect(state.totalPrompts).toBe(10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should clamp values above 50 to exactly 50', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 51, max: 200 }),
        (promptCount) => {
          const controller = new ExerciseController();
          const prompts = makeDummyPrompts(60);

          const config: ExerciseConfig = {
            category: 'function-keys',
            promptCount,
            prompts,
          };

          controller.start(config);
          const state = controller.getState();

          expect(state.totalPrompts).toBe(50);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should preserve values within [10, 50] as-is', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        (promptCount) => {
          const controller = new ExerciseController();
          const prompts = makeDummyPrompts(60);

          const config: ExerciseConfig = {
            category: 'combinations',
            promptCount,
            prompts,
          };

          controller.start(config);
          const state = controller.getState();

          expect(state.totalPrompts).toBe(promptCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});

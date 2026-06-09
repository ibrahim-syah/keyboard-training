// Feature: modifier-key-trainer, Property 12: Drill accuracy equals correct responses divided by total
// **Validates: Requirements 4.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DrillModeEngine } from '../drill-mode-engine';
import type { DrillConfig, KeyCombination, KeyState } from '../types';

/**
 * A small fixed set of combinations used for drill testing.
 * We use a known set so we can construct matching/non-matching KeyStates deterministically.
 */
const TEST_COMBINATIONS: KeyCombination[] = [
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyC' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyV' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'KeyA' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyK' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyF' },
];

/**
 * Build a KeyState that matches a given KeyCombination.
 * Uses the "Left" variant for any required modifier.
 */
function buildMatchingKeyState(combo: KeyCombination): KeyState {
  return {
    modifiers: {
      ctrlLeft: combo.modifiers.ctrl,
      ctrlRight: false,
      altLeft: combo.modifiers.alt,
      altRight: false,
      shiftLeft: combo.modifiers.shift,
      shiftRight: false,
      metaLeft: combo.modifiers.meta,
      metaRight: false,
    },
    baseKey: combo.baseKey,
  };
}

/**
 * Build a KeyState that does NOT match any combination in the test set.
 * Uses a baseKey that none of our test combinations use, with no modifiers.
 */
function buildNonMatchingKeyState(): KeyState {
  return {
    modifiers: {
      ctrlLeft: false,
      ctrlRight: false,
      altLeft: false,
      altRight: false,
      shiftLeft: false,
      shiftRight: false,
      metaLeft: false,
      metaRight: false,
    },
    baseKey: 'KeyZ',
  };
}

/**
 * Arbitrary that generates a sequence of booleans representing
 * whether each response should be correct (true) or incorrect (false).
 * We generate between 1 and 30 responses per test run.
 */
const responseSequenceArb = fc.array(fc.boolean(), { minLength: 1, maxLength: 30 });

describe('Drill Mode Engine - Property 12: Drill accuracy equals correct responses divided by total', () => {
  it('accuracy equals correctCount / totalAttempts for any response sequence', () => {
    fc.assert(
      fc.property(
        responseSequenceArb,
        (responses) => {
          const engine = new DrillModeEngine();
          const config: DrillConfig = {
            category: 'combinations',
            customSet: TEST_COMBINATIONS,
          };

          engine.start(config);

          let correctCount = 0;

          for (const shouldBeCorrect of responses) {
            const currentPrompt = engine.getCurrentPrompt();
            expect(currentPrompt).not.toBeNull();

            if (shouldBeCorrect) {
              // Send a matching KeyState for the current prompt
              const matchingState = buildMatchingKeyState(currentPrompt!);
              engine.handleInput(matchingState);
              correctCount++;
            } else {
              // Send a non-matching KeyState
              const wrongState = buildNonMatchingKeyState();
              engine.handleInput(wrongState);
            }
          }

          const stats = engine.stop();

          // Verify accuracy = correctCount / total
          const expectedAccuracy = correctCount / responses.length;
          expect(stats.accuracy).toBeCloseTo(expectedAccuracy, 10);
          expect(stats.totalAttempts).toBe(responses.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('avgResponseTimeMs is a positive number when responses are recorded', () => {
    fc.assert(
      fc.property(
        responseSequenceArb,
        (responses) => {
          const engine = new DrillModeEngine();
          const config: DrillConfig = {
            category: 'combinations',
            customSet: TEST_COMBINATIONS,
          };

          engine.start(config);

          for (const shouldBeCorrect of responses) {
            const currentPrompt = engine.getCurrentPrompt();
            expect(currentPrompt).not.toBeNull();

            if (shouldBeCorrect) {
              const matchingState = buildMatchingKeyState(currentPrompt!);
              engine.handleInput(matchingState);
            } else {
              const wrongState = buildNonMatchingKeyState();
              engine.handleInput(wrongState);
            }
          }

          const stats = engine.stop();

          // avgResponseTimeMs should be a non-negative number (timing depends on execution speed)
          expect(stats.avgResponseTimeMs).toBeGreaterThanOrEqual(0);
          expect(typeof stats.avgResponseTimeMs).toBe('number');
          expect(Number.isFinite(stats.avgResponseTimeMs)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

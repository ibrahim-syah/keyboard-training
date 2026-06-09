// Feature: modifier-key-trainer, Property 11: Adaptive drill weighting gives missed combinations at least 2x frequency
// **Validates: Requirements 4.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DrillModeEngine } from '../drill-mode-engine';
import type { KeyCombination } from '../types';

/**
 * Creates a set of distinct KeyCombinations for testing.
 */
function createTestCombinations(count: number): KeyCombination[] {
  const combos: KeyCombination[] = [];
  const baseKeys = ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ'];
  for (let i = 0; i < count; i++) {
    combos.push({
      modifiers: { ctrl: i % 2 === 0, alt: i % 3 === 0, shift: i % 4 === 0, meta: false },
      baseKey: baseKeys[i % baseKeys.length],
    });
  }
  return combos;
}

/**
 * Generates the combination key string the same way DrillModeEngine does internally.
 */
function combinationKey(combo: KeyCombination): string {
  const m = combo.modifiers;
  return `${m.ctrl ? 1 : 0}${m.alt ? 1 : 0}${m.shift ? 1 : 0}${m.meta ? 1 : 0}:${combo.baseKey}`;
}

/**
 * Arbitrary that generates a partition of combo indices into "missed" (errors/slow) and "correct" (fast).
 * Ensures at least 1 combo is missed and at least 1 is correct.
 */
const partitionArb = (comboCount: number) =>
  fc.uniqueArray(fc.integer({ min: 0, max: comboCount - 1 }), { minLength: 1, maxLength: comboCount - 1 })
    .filter((missedIndices) => missedIndices.length < comboCount); // ensure at least one correct

describe('Drill Mode Engine - Property 11: Adaptive drill weighting gives missed combinations at least 2x frequency', () => {
  it('missed/slow combinations should appear at least ~1.5x as often as correct/fast combinations (statistical)', () => {
    const COMBO_COUNT = 5;
    const SAMPLE_SIZE = 1000;
    const combos = createTestCombinations(COMBO_COUNT);

    fc.assert(
      fc.property(
        partitionArb(COMBO_COUNT),
        fc.integer({ min: 10, max: 20 }), // total responses to simulate (at least 10 to trigger adaptive mode)
        (missedIndices, responseCount) => {
          const engine = new DrillModeEngine();

          // Start the engine with our custom set
          engine.start({ category: 'modifiers', customSet: combos });

          // Directly set the internal state to simulate response history
          // We access private members via 'as any' for testing purposes
          const engineAny = engine as any;

          // Set totalResponses to be ≥10 so adaptive weighting kicks in
          engineAny.totalResponses = responseCount;

          // Configure combination stats:
          // - Missed indices: have errors (attempts > correctCount) 
          // - Correct indices: perfect accuracy with fast response time
          const missedSet = new Set(missedIndices);
          for (let i = 0; i < COMBO_COUNT; i++) {
            const key = combinationKey(combos[i]);
            const track = engineAny.combinationStats.get(key);
            if (track) {
              if (missedSet.has(i)) {
                // Missed: has errors (only 1 correct out of 5 attempts)
                track.attempts = 5;
                track.correctCount = 1;
                track.totalResponseTimeMs = 10000; // avg 2000ms (not slow, but has errors)
              } else {
                // Correct: all correct with fast response time
                track.attempts = 5;
                track.correctCount = 5;
                track.totalResponseTimeMs = 5000; // avg 1000ms (well under 3s)
              }
            }
          }

          // Sample getWeightedNextPrompt many times and count frequencies
          const counts: Record<string, number> = {};
          for (const combo of combos) {
            counts[combinationKey(combo)] = 0;
          }

          for (let i = 0; i < SAMPLE_SIZE; i++) {
            const selected = engine.getWeightedNextPrompt();
            counts[combinationKey(selected)]++;
          }

          // Calculate average frequency for missed vs correct combos
          const missedCount = missedIndices.length;
          const correctCount = COMBO_COUNT - missedCount;

          let totalMissedFreq = 0;
          let totalCorrectFreq = 0;

          for (let i = 0; i < COMBO_COUNT; i++) {
            const key = combinationKey(combos[i]);
            if (missedSet.has(i)) {
              totalMissedFreq += counts[key];
            } else {
              totalCorrectFreq += counts[key];
            }
          }

          const avgMissedFreq = totalMissedFreq / missedCount;
          const avgCorrectFreq = totalCorrectFreq / correctCount;

          // The weighting algorithm gives missed combos weight=2 and correct combos weight=1,
          // so the expected ratio is 2.0. We use 1.5 as a lower bound to account for
          // statistical variance in random sampling (1000 samples).
          // We only check the ratio if correct combos have been selected at all
          // to avoid division by zero.
          if (avgCorrectFreq > 0) {
            const ratio = avgMissedFreq / avgCorrectFreq;
            expect(ratio).toBeGreaterThanOrEqual(1.5);
          } else {
            // If correct combos never got selected, missed combos clearly dominate
            // This is still a valid outcome given the weighting
            expect(totalMissedFreq).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 } // Fewer property runs since each run samples 1000 times
    );
  });

  it('combinations with slow response time (>3s avg) should also get increased weighting', () => {
    const COMBO_COUNT = 5;
    const SAMPLE_SIZE = 1000;
    const combos = createTestCombinations(COMBO_COUNT);

    fc.assert(
      fc.property(
        partitionArb(COMBO_COUNT),
        (slowIndices) => {
          const engine = new DrillModeEngine();
          engine.start({ category: 'modifiers', customSet: combos });

          const engineAny = engine as any;
          engineAny.totalResponses = 15; // Trigger adaptive mode

          // Configure: slow indices have high response times but are all correct
          const slowSet = new Set(slowIndices);
          for (let i = 0; i < COMBO_COUNT; i++) {
            const key = combinationKey(combos[i]);
            const track = engineAny.combinationStats.get(key);
            if (track) {
              if (slowSet.has(i)) {
                // Slow: all correct but avg response time > 3000ms
                track.attempts = 5;
                track.correctCount = 5;
                track.totalResponseTimeMs = 20000; // avg 4000ms (>3s threshold)
              } else {
                // Fast: all correct and fast
                track.attempts = 5;
                track.correctCount = 5;
                track.totalResponseTimeMs = 5000; // avg 1000ms
              }
            }
          }

          // Sample
          const counts: Record<string, number> = {};
          for (const combo of combos) {
            counts[combinationKey(combo)] = 0;
          }

          for (let i = 0; i < SAMPLE_SIZE; i++) {
            const selected = engine.getWeightedNextPrompt();
            counts[combinationKey(selected)]++;
          }

          // Calculate ratios
          const slowCount = slowIndices.length;
          const fastCount = COMBO_COUNT - slowCount;

          let totalSlowFreq = 0;
          let totalFastFreq = 0;

          for (let i = 0; i < COMBO_COUNT; i++) {
            const key = combinationKey(combos[i]);
            if (slowSet.has(i)) {
              totalSlowFreq += counts[key];
            } else {
              totalFastFreq += counts[key];
            }
          }

          const avgSlowFreq = totalSlowFreq / slowCount;
          const avgFastFreq = totalFastFreq / fastCount;

          if (avgFastFreq > 0) {
            const ratio = avgSlowFreq / avgFastFreq;
            expect(ratio).toBeGreaterThanOrEqual(1.5);
          } else {
            expect(totalSlowFreq).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

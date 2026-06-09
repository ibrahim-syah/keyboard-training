// Feature: modifier-key-trainer, Property 16: Weakest combinations ranked by lowest accuracy then slowest response time
// **Validates: Requirements 5.3**

import { describe, it, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { saveSession, getWeakestCombinations } from '../progress-tracker';
import type { SessionRecord, CombinationStat, KeyCombination } from '../types';

/**
 * Pool of base key codes to draw from when generating random combinations.
 */
const BASE_KEY_CODES = [
  'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH',
  'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP',
  'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX',
  'KeyY', 'KeyZ', 'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4',
  'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'F1', 'F2',
  'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
];

/**
 * Arbitrary for generating a unique KeyCombination.
 */
const keyCombinationArb: fc.Arbitrary<KeyCombination> = fc.record({
  modifiers: fc.record({
    ctrl: fc.boolean(),
    alt: fc.boolean(),
    shift: fc.boolean(),
    meta: fc.boolean(),
  }),
  baseKey: fc.constantFrom(...BASE_KEY_CODES),
});

/**
 * Arbitrary for generating a CombinationStat with controlled accuracy and response time.
 */
const combinationStatArb: fc.Arbitrary<CombinationStat> = fc.tuple(
  keyCombinationArb,
  fc.integer({ min: 1, max: 100 }),  // attempts
  fc.integer({ min: 0, max: 100 }),  // correctCount (will be clamped to attempts)
  fc.integer({ min: 50, max: 5000 }), // avgResponseTimeMs
).map(([combination, attempts, rawCorrect, avgResponseTimeMs]) => ({
  combination,
  attempts,
  correctCount: Math.min(rawCorrect, attempts),
  avgResponseTimeMs,
}));

/**
 * Generate a unique key for a combination to check for duplicates.
 */
function combinationKey(combination: KeyCombination): string {
  const mods = combination.modifiers;
  const modStr = [
    mods.ctrl ? 'ctrl' : '',
    mods.alt ? 'alt' : '',
    mods.shift ? 'shift' : '',
    mods.meta ? 'meta' : '',
  ]
    .filter(Boolean)
    .join('+');
  return modStr ? `${modStr}+${combination.baseKey}` : combination.baseKey;
}

/**
 * Generate a list of CombinationStats with unique combinations.
 */
const uniqueCombinationStatsArb = fc
  .array(combinationStatArb, { minLength: 2, maxLength: 20 })
  .map((stats) => {
    // Deduplicate by combination key
    const seen = new Set<string>();
    const unique: CombinationStat[] = [];
    for (const stat of stats) {
      const key = combinationKey(stat.combination);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(stat);
      }
    }
    return unique;
  })
  .filter((stats) => stats.length >= 2);

describe('Progress Tracker - Property 16: Weakest combinations ranked by lowest accuracy then slowest response time', () => {
  let originalLocalStorage: Storage;
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    originalLocalStorage = globalThis.localStorage;

    const localStorageMock: Storage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      get length() {
        return Object.keys(mockStorage).length;
      },
      key: (index: number) => Object.keys(mockStorage)[index] ?? null,
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it('should rank weakest combinations by accuracy ascending, then by response time descending for ties', () => {
    fc.assert(
      fc.property(uniqueCombinationStatsArb, (combinationStats) => {
        // Clear mock storage for each iteration
        mockStorage = {};

        // Create a SessionRecord containing the generated combination stats
        const session: SessionRecord = {
          id: 'test-session-1',
          date: new Date().toISOString(),
          category: 'combinations',
          accuracy: 0.8,
          avgResponseTimeMs: 500,
          promptCount: combinationStats.length,
          perCombinationData: combinationStats,
        };

        // Save the session
        const saved = saveSession(session);
        if (!saved) {
          throw new Error('Failed to save session');
        }

        // Retrieve weakest combinations (up to 5)
        const limit = 5;
        const weakest = getWeakestCombinations(limit);

        // Verify length is at most the limit and at most the total unique combinations
        if (weakest.length > limit) {
          throw new Error(
            `Expected at most ${limit} results, got ${weakest.length}`
          );
        }
        if (weakest.length > combinationStats.length) {
          throw new Error(
            `Expected at most ${combinationStats.length} results, got ${weakest.length}`
          );
        }

        // Verify the result is sorted correctly:
        // 1. By accuracy ascending (correctCount / attempts)
        // 2. For ties in accuracy, by avgResponseTimeMs descending (slowest first)
        for (let i = 0; i < weakest.length - 1; i++) {
          const a = weakest[i];
          const b = weakest[i + 1];

          const accuracyA = a.attempts > 0 ? a.correctCount / a.attempts : 0;
          const accuracyB = b.attempts > 0 ? b.correctCount / b.attempts : 0;

          if (accuracyA > accuracyB) {
            throw new Error(
              `Sort violation at index ${i}: accuracy ${accuracyA} > ${accuracyB} (should be ascending)`
            );
          }

          // If accuracies are equal, response time should be descending
          if (accuracyA === accuracyB) {
            if (a.avgResponseTimeMs < b.avgResponseTimeMs) {
              throw new Error(
                `Tie-break violation at index ${i}: response time ${a.avgResponseTimeMs}ms < ${b.avgResponseTimeMs}ms (should be descending for ties)`
              );
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should return the combinations with the lowest accuracies first', () => {
    fc.assert(
      fc.property(uniqueCombinationStatsArb, (combinationStats) => {
        // Clear mock storage for each iteration
        mockStorage = {};

        const session: SessionRecord = {
          id: 'test-session-2',
          date: new Date().toISOString(),
          category: 'modifiers',
          accuracy: 0.7,
          avgResponseTimeMs: 600,
          promptCount: combinationStats.length,
          perCombinationData: combinationStats,
        };

        saveSession(session);

        const limit = 5;
        const weakest = getWeakestCombinations(limit);

        // Compute accuracies for all combinations and sort them
        const allAccuracies = combinationStats
          .map((s) => (s.attempts > 0 ? s.correctCount / s.attempts : 0))
          .sort((a, b) => a - b);

        // The weakest returned should have accuracies that are among the lowest
        for (const w of weakest) {
          const wAccuracy = w.attempts > 0 ? w.correctCount / w.attempts : 0;
          // The accuracy of each returned combination should be <= the accuracy
          // at the limit-th position (or last position if fewer combinations exist)
          const cutoffIndex = Math.min(limit, allAccuracies.length) - 1;
          const cutoffAccuracy = allAccuracies[cutoffIndex];
          if (wAccuracy > cutoffAccuracy) {
            throw new Error(
              `Returned combination with accuracy ${wAccuracy} exceeds cutoff ${cutoffAccuracy}`
            );
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

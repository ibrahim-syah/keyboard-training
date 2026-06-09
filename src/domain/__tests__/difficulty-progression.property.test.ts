// Feature: modifier-key-trainer, Property 23: Level progression unlocks only when all criteria met
// **Validates: Requirements 7.3, 7.4**

// Polyfill localStorage for jsdom environments
function createLocalStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem(key: string): string | null {
      return store[key] ?? null;
    },
    setItem(key: string, value: string): void {
      store[key] = String(value);
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      store = {};
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
  };
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createLocalStorageMock(),
    writable: true,
  });
}

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { checkProgression } from '../difficulty-manager';
import type { KeyCategory } from '../types';

/**
 * Property 23: Level progression unlocks only when all criteria met
 *
 * For any (accuracy, averageResponseTime, attempts) tuple for a given level,
 * the next level SHALL be unlocked if and only if:
 *   accuracy > 0.9 AND averageResponseTime < 1000ms AND attempts >= 20.
 * If any single criterion is not met, the level SHALL remain locked.
 */

const CATEGORIES: KeyCategory[] = [
  'modifiers',
  'numbers',
  'function-keys',
  'navigation',
  'combinations',
];

const categoryArb = fc.constantFrom(...CATEGORIES);

describe('Property 23: Level progression unlocks only when all criteria met', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('unlocks next level if and only if all three criteria are met', () => {
    fc.assert(
      fc.property(
        categoryArb,
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 100, max: 5000, noNaN: true }),
        fc.integer({ min: 0, max: 50 }),
        (category, accuracy, avgResponseTimeMs, attempts) => {
          // Reset localStorage to ensure fresh default progress (only level 1 unlocked)
          localStorage.clear();

          const stats = { accuracy, avgResponseTimeMs, attempts };
          const result = checkProgression(category, stats);

          const meetsAccuracy = accuracy > 0.9;
          const meetsSpeed = avgResponseTimeMs < 1000;
          const meetsAttempts = attempts >= 20;
          const allCriteriaMet = meetsAccuracy && meetsSpeed && meetsAttempts;

          if (allCriteriaMet) {
            // When all criteria are met and there's a next level to unlock, returns true
            expect(result).toBe(true);
          } else {
            // When any criterion is not met, returns false (level stays locked)
            expect(result).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when accuracy criterion alone is not met', () => {
    fc.assert(
      fc.property(
        categoryArb,
        // accuracy <= 0.9 (fails criterion)
        fc.double({ min: 0, max: 0.9, noNaN: true }),
        // speed meets criterion
        fc.double({ min: 100, max: 999, noNaN: true }),
        // attempts meets criterion
        fc.integer({ min: 20, max: 50 }),
        (category, accuracy, avgResponseTimeMs, attempts) => {
          localStorage.clear();

          const stats = { accuracy, avgResponseTimeMs, attempts };
          const result = checkProgression(category, stats);

          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when speed criterion alone is not met', () => {
    fc.assert(
      fc.property(
        categoryArb,
        // accuracy meets criterion (> 0.9)
        fc.double({ min: 0.91, max: 1, noNaN: true }),
        // speed does NOT meet criterion (>= 1000)
        fc.double({ min: 1000, max: 5000, noNaN: true }),
        // attempts meets criterion
        fc.integer({ min: 20, max: 50 }),
        (category, accuracy, avgResponseTimeMs, attempts) => {
          localStorage.clear();

          const stats = { accuracy, avgResponseTimeMs, attempts };
          const result = checkProgression(category, stats);

          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when attempts criterion alone is not met', () => {
    fc.assert(
      fc.property(
        categoryArb,
        // accuracy meets criterion
        fc.double({ min: 0.91, max: 1, noNaN: true }),
        // speed meets criterion
        fc.double({ min: 100, max: 999, noNaN: true }),
        // attempts does NOT meet criterion (< 20)
        fc.integer({ min: 0, max: 19 }),
        (category, accuracy, avgResponseTimeMs, attempts) => {
          localStorage.clear();

          const stats = { accuracy, avgResponseTimeMs, attempts };
          const result = checkProgression(category, stats);

          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

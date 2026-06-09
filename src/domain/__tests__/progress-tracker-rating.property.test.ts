// Feature: modifier-key-trainer, Property 17: Proficiency star rating follows threshold rules
// **Validates: Requirements 5.4, 5.6**

// Polyfill localStorage for jsdom environments (jsdom 29 + Node 26 doesn't expose it)
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
import { saveSession, getProficiencyRating } from '../progress-tracker';
import type { KeyCategory, SessionRecord } from '../types';

/**
 * Property 17: Proficiency star rating follows threshold rules
 * For any accuracy percentage and average response time, the star rating SHALL be:
 * - 1 star if accuracy < 50%
 * - 2 stars if accuracy >= 50% and < 70%
 * - 3 stars if accuracy >= 70% and < 85%
 * - 4 stars if accuracy >= 85% and < 95%
 * - 5 stars if accuracy >= 95% AND average response time < 1000ms
 * - If accuracy >= 95% but response time >= 1000ms → 4 stars
 * Returns null if fewer than 5 sessions completed.
 */

const CATEGORIES: KeyCategory[] = [
  'modifiers',
  'numbers',
  'function-keys',
  'navigation',
  'combinations',
];

const categoryArb = fc.constantFrom(...CATEGORIES);

function makeSession(
  category: KeyCategory,
  accuracy: number,
  avgResponseTimeMs: number,
  index: number,
): SessionRecord {
  return {
    id: `session-${index}-${Date.now()}-${Math.random()}`,
    date: new Date().toISOString(),
    category,
    accuracy,
    avgResponseTimeMs,
    promptCount: 20,
    perCombinationData: [],
  };
}

function computeExpectedStars(avgAccuracy: number, avgResponseTime: number): number {
  const accuracyPercent = avgAccuracy * 100;

  if (accuracyPercent >= 95) {
    if (avgResponseTime < 1000) {
      return 5;
    }
    return 4;
  }

  if (accuracyPercent >= 85) {
    return 4;
  }

  if (accuracyPercent >= 70) {
    return 3;
  }

  if (accuracyPercent >= 50) {
    return 2;
  }

  return 1;
}

describe('Property 17: Proficiency star rating follows threshold rules', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when fewer than 5 sessions exist for the category', () => {
    fc.assert(
      fc.property(
        categoryArb,
        fc.integer({ min: 0, max: 4 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 100, max: 5000, noNaN: true }),
        (category, sessionCount, accuracy, avgResponseTimeMs) => {
          localStorage.clear();

          for (let i = 0; i < sessionCount; i++) {
            saveSession(makeSession(category, accuracy, avgResponseTimeMs, i));
          }

          const rating = getProficiencyRating(category);
          expect(rating).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('computes correct star rating based on accuracy and response time thresholds', () => {
    fc.assert(
      fc.property(
        categoryArb,
        fc.array(
          fc.record({
            accuracy: fc.double({ min: 0, max: 1, noNaN: true }),
            avgResponseTimeMs: fc.double({ min: 50, max: 5000, noNaN: true }),
          }),
          { minLength: 5, maxLength: 10 },
        ),
        (category, sessionsData) => {
          localStorage.clear();

          for (let i = 0; i < sessionsData.length; i++) {
            saveSession(
              makeSession(category, sessionsData[i].accuracy, sessionsData[i].avgResponseTimeMs, i),
            );
          }

          const rating = getProficiencyRating(category);

          // Compute expected rating from the average accuracy and avg response time
          const totalAccuracy = sessionsData.reduce((sum, s) => sum + s.accuracy, 0);
          const totalResponseTime = sessionsData.reduce((sum, s) => sum + s.avgResponseTimeMs, 0);
          const avgAccuracy = totalAccuracy / sessionsData.length;
          const avgResponseTime = totalResponseTime / sessionsData.length;

          const expectedStars = computeExpectedStars(avgAccuracy, avgResponseTime);

          expect(rating).toBe(expectedStars);
        },
      ),
      { numRuns: 100 },
    );
  });
});

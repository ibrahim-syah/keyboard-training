// Feature: modifier-key-trainer, Property 15: Session filter returns only records within 30 days
// **Validates: Requirements 5.2**

import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { saveSession, getSessions } from '../progress-tracker';
import type { SessionRecord, KeyCategory } from '../types';

/**
 * Arbitrary for generating a random KeyCategory.
 */
const keyCategoryArb: fc.Arbitrary<KeyCategory> = fc.constantFrom(
  'modifiers',
  'numbers',
  'function-keys',
  'navigation',
  'combinations',
);

/**
 * Generate a random date between `daysAgo` days ago and today.
 * Returns an ISO 8601 date string.
 */
function dateArbitrary(maxDaysAgo: number): fc.Arbitrary<string> {
  const now = Date.now();
  const maxMs = maxDaysAgo * 24 * 60 * 60 * 1000;
  return fc.integer({ min: 0, max: maxMs }).map((msAgo) => {
    return new Date(now - msAgo).toISOString();
  });
}

/**
 * Generate a random SessionRecord with a date within the specified range.
 */
function sessionRecordArb(maxDaysAgo: number): fc.Arbitrary<SessionRecord> {
  return fc.record({
    id: fc.uuid(),
    date: dateArbitrary(maxDaysAgo),
    category: keyCategoryArb,
    accuracy: fc.double({ min: 0, max: 1, noNaN: true }),
    avgResponseTimeMs: fc.integer({ min: 100, max: 5000 }),
    promptCount: fc.integer({ min: 10, max: 50 }),
    perCombinationData: fc.constant([]),
  });
}

/**
 * Generate an array of SessionRecords with dates spanning from 60 days ago to today.
 * Ensures at least one session is older than 30 days and at least one is within 30 days.
 */
const sessionsSpanning60DaysArb: fc.Arbitrary<SessionRecord[]> = fc
  .tuple(
    // At least one old session (31-60 days ago)
    fc.array(sessionRecordArb(60), { minLength: 1, maxLength: 10 }).chain((sessions) =>
      fc.constant(
        sessions.map((s) => ({
          ...s,
          date: new Date(
            Date.now() - fc.sample(fc.integer({ min: 31, max: 60 }), 1)[0] * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })),
      ),
    ),
    // At least one recent session (0-29 days ago)
    fc.array(sessionRecordArb(29), { minLength: 1, maxLength: 10 }),
  )
  .map(([oldSessions, recentSessions]) => [...oldSessions, ...recentSessions]);

describe('Progress Tracker - Property 15: Session filter returns only records within 30 days', () => {
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
    vi.restoreAllMocks();
  });

  it('should return only sessions within the last 30 days and exclude all older sessions', () => {
    fc.assert(
      fc.property(
        fc.array(sessionRecordArb(60), { minLength: 1, maxLength: 20 }),
        (sessions) => {
          // Clear storage for each iteration
          mockStorage = {};

          // Save all sessions
          for (const session of sessions) {
            saveSession(session);
          }

          // Get sessions filtered to last 30 days
          const result = getSessions(undefined, 30);

          const now = Date.now();
          const cutoff = now - 30 * 24 * 60 * 60 * 1000;

          // Verify all returned sessions have dates within last 30 days
          for (const session of result) {
            const sessionTime = new Date(session.date).getTime();
            if (sessionTime < cutoff) {
              throw new Error(
                `Session with date ${session.date} is older than 30 days but was returned by filter`,
              );
            }
          }

          // Verify no session within 30 days is missing from the result
          const expectedRecent = sessions.filter(
            (s) => new Date(s.date).getTime() >= cutoff,
          );

          if (result.length !== expectedRecent.length) {
            throw new Error(
              `Expected ${expectedRecent.length} recent sessions but got ${result.length}`,
            );
          }

          // Verify that sessions older than 30 days are NOT in the result
          const oldSessions = sessions.filter(
            (s) => new Date(s.date).getTime() < cutoff,
          );
          const resultIds = new Set(result.map((s) => s.id));
          for (const oldSession of oldSessions) {
            if (resultIds.has(oldSession.id)) {
              throw new Error(
                `Session ${oldSession.id} with date ${oldSession.date} is older than 30 days but was included in result`,
              );
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

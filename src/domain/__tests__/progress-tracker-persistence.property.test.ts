// Feature: modifier-key-trainer, Property 14: Session persistence round-trip preserves data
// **Validates: Requirements 5.1**

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

import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { saveSession, getSessions } from '../progress-tracker';
import type { SessionRecord, KeyCategory, KeyCombination, CombinationStat } from '../types';

/**
 * Arbitrary for generating a valid KeyCategory.
 */
const keyCategoryArb: fc.Arbitrary<KeyCategory> = fc.constantFrom(
  'modifiers',
  'numbers',
  'function-keys',
  'navigation',
  'combinations',
);

/**
 * Arbitrary for generating a valid ModifierSet.
 */
const modifierSetArb = fc.record({
  ctrl: fc.boolean(),
  alt: fc.boolean(),
  shift: fc.boolean(),
  meta: fc.boolean(),
});

/**
 * Arbitrary for generating a valid base key code.
 */
const baseKeyCodeArb = fc.constantFrom(
  'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG',
  'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN',
  'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9',
  'Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
);

/**
 * Arbitrary for generating a valid KeyCombination.
 */
const keyCombinationArb: fc.Arbitrary<KeyCombination> = fc.record({
  modifiers: modifierSetArb,
  baseKey: baseKeyCodeArb,
});

/**
 * Arbitrary for generating a valid CombinationStat.
 */
const combinationStatArb: fc.Arbitrary<CombinationStat> = fc.record({
  combination: keyCombinationArb,
  attempts: fc.integer({ min: 1, max: 100 }),
  correctCount: fc.integer({ min: 0, max: 100 }),
  avgResponseTimeMs: fc.double({ min: 100, max: 10000, noNaN: true }),
});

/**
 * Arbitrary for generating a valid SessionRecord.
 */
const sessionRecordArb: fc.Arbitrary<SessionRecord> = fc.record({
  id: fc.uuid(),
  date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(
    (d) => d.toISOString(),
  ),
  category: keyCategoryArb,
  accuracy: fc.double({ min: 0, max: 1, noNaN: true }),
  avgResponseTimeMs: fc.double({ min: 100, max: 10000, noNaN: true }),
  promptCount: fc.integer({ min: 10, max: 50 }),
  perCombinationData: fc.array(combinationStatArb, { minLength: 1, maxLength: 10 }),
});

describe('Progress Tracker - Property 14: Session persistence round-trip preserves data', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should preserve SessionRecord data through save and retrieve round-trip', () => {
    fc.assert(
      fc.property(sessionRecordArb, (record) => {
        // Clear storage before each iteration to isolate tests
        localStorage.clear();

        // Save the session record
        const saved = saveSession(record);
        if (!saved) {
          throw new Error('saveSession returned false - storage write failed');
        }

        // Retrieve all sessions
        const sessions = getSessions();

        // Find the saved record by id
        const retrieved = sessions.find((s) => s.id === record.id);
        if (!retrieved) {
          throw new Error(`Session with id "${record.id}" not found after save`);
        }

        // Verify deep equality of all fields
        if (retrieved.id !== record.id) {
          throw new Error(`id mismatch: expected "${record.id}", got "${retrieved.id}"`);
        }
        if (retrieved.date !== record.date) {
          throw new Error(`date mismatch: expected "${record.date}", got "${retrieved.date}"`);
        }
        if (retrieved.category !== record.category) {
          throw new Error(
            `category mismatch: expected "${record.category}", got "${retrieved.category}"`,
          );
        }
        if (retrieved.accuracy !== record.accuracy) {
          throw new Error(
            `accuracy mismatch: expected ${record.accuracy}, got ${retrieved.accuracy}`,
          );
        }
        if (retrieved.avgResponseTimeMs !== record.avgResponseTimeMs) {
          throw new Error(
            `avgResponseTimeMs mismatch: expected ${record.avgResponseTimeMs}, got ${retrieved.avgResponseTimeMs}`,
          );
        }
        if (retrieved.promptCount !== record.promptCount) {
          throw new Error(
            `promptCount mismatch: expected ${record.promptCount}, got ${retrieved.promptCount}`,
          );
        }

        // Verify perCombinationData array
        if (retrieved.perCombinationData.length !== record.perCombinationData.length) {
          throw new Error(
            `perCombinationData length mismatch: expected ${record.perCombinationData.length}, got ${retrieved.perCombinationData.length}`,
          );
        }

        for (let i = 0; i < record.perCombinationData.length; i++) {
          const original = record.perCombinationData[i];
          const restored = retrieved.perCombinationData[i];

          if (restored.attempts !== original.attempts) {
            throw new Error(
              `perCombinationData[${i}].attempts mismatch: expected ${original.attempts}, got ${restored.attempts}`,
            );
          }
          if (restored.correctCount !== original.correctCount) {
            throw new Error(
              `perCombinationData[${i}].correctCount mismatch: expected ${original.correctCount}, got ${restored.correctCount}`,
            );
          }
          if (restored.avgResponseTimeMs !== original.avgResponseTimeMs) {
            throw new Error(
              `perCombinationData[${i}].avgResponseTimeMs mismatch: expected ${original.avgResponseTimeMs}, got ${restored.avgResponseTimeMs}`,
            );
          }
          if (restored.combination.baseKey !== original.combination.baseKey) {
            throw new Error(
              `perCombinationData[${i}].combination.baseKey mismatch: expected "${original.combination.baseKey}", got "${restored.combination.baseKey}"`,
            );
          }
          if (restored.combination.modifiers.ctrl !== original.combination.modifiers.ctrl) {
            throw new Error(
              `perCombinationData[${i}].combination.modifiers.ctrl mismatch`,
            );
          }
          if (restored.combination.modifiers.alt !== original.combination.modifiers.alt) {
            throw new Error(
              `perCombinationData[${i}].combination.modifiers.alt mismatch`,
            );
          }
          if (restored.combination.modifiers.shift !== original.combination.modifiers.shift) {
            throw new Error(
              `perCombinationData[${i}].combination.modifiers.shift mismatch`,
            );
          }
          if (restored.combination.modifiers.meta !== original.combination.modifiers.meta) {
            throw new Error(
              `perCombinationData[${i}].combination.modifiers.meta mismatch`,
            );
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

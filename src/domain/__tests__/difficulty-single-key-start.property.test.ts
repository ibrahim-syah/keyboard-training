// Feature: modifier-key-trainer, Property 21: New category training starts with single-key prompts
// **Validates: Requirements 7.1**

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
import { getPromptsForLevel } from '../difficulty-manager';
import type { KeyCategory, DifficultyLevel } from '../types';

/**
 * Property 21: New category training starts with single-key prompts
 *
 * For any key category where the user has no prior history, the first 10 prompts
 * presented SHALL all be single-key prompts (no modifiers required), regardless
 * of the category's available combinations.
 */

// Categories that have single-key prompts (no modifiers)
const CATEGORIES_WITH_SINGLE_KEYS: KeyCategory[] = [
  'numbers',
  'function-keys',
  'navigation',
];

const ALL_CATEGORIES: KeyCategory[] = [
  'modifiers',
  'numbers',
  'function-keys',
  'navigation',
  'combinations',
];

const categoryWithSingleKeysArb = fc.constantFrom(...CATEGORIES_WITH_SINGLE_KEYS);
const allCategoryArb = fc.constantFrom(...ALL_CATEGORIES);
const levelArb = fc.constantFrom(1, 2, 3, 4) as fc.Arbitrary<DifficultyLevel>;

describe('Property 21: New category training starts with single-key prompts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns only single-key prompts for new categories that have them', () => {
    fc.assert(
      fc.property(
        categoryWithSingleKeysArb,
        levelArb,
        (category, level) => {
          // Clear localStorage to simulate no prior history
          localStorage.clear();

          const prompts = getPromptsForLevel(category, level);

          // All returned prompts should be single-key (no modifiers)
          for (const prompt of prompts) {
            expect(prompt.modifiers.ctrl).toBe(false);
            expect(prompt.modifiers.alt).toBe(false);
            expect(prompt.modifiers.shift).toBe(false);
            expect(prompt.modifiers.meta).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns at most 10 single-key prompts for new categories', () => {
    fc.assert(
      fc.property(
        categoryWithSingleKeysArb,
        levelArb,
        (category, level) => {
          // Clear localStorage to simulate no prior history
          localStorage.clear();

          const prompts = getPromptsForLevel(category, level);

          // Should return up to 10 prompts
          expect(prompts.length).toBeGreaterThan(0);
          expect(prompts.length).toBeLessThanOrEqual(10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('single-key behavior applies regardless of requested difficulty level', () => {
    fc.assert(
      fc.property(
        categoryWithSingleKeysArb,
        levelArb,
        (category, level) => {
          // Clear localStorage to ensure fresh state
          localStorage.clear();

          const prompts = getPromptsForLevel(category, level);

          // Regardless of requested level, new category gets single-key prompts
          for (const prompt of prompts) {
            const hasModifier =
              prompt.modifiers.ctrl ||
              prompt.modifiers.alt ||
              prompt.modifiers.shift ||
              prompt.modifiers.meta;
            expect(hasModifier).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: modifier-key-trainer, Property 6: Mixed-mode draws from all categories with approximately equal probability
// **Validates: Requirements 2.4**

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { getMixedPrompts } from '../prompt-selector';
import { KEY_PROMPTS_BY_CATEGORY } from '../../data/key-prompts';
import type { KeyCategory, KeyCombination } from '../types';

/**
 * All available categories for mixed-mode distribution.
 */
const ALL_CATEGORIES: KeyCategory[] = [
  'modifiers',
  'numbers',
  'function-keys',
  'navigation',
  'combinations',
];

const NUM_CATEGORIES = ALL_CATEGORIES.length;

/**
 * Helper to check if two KeyCombinations are equal.
 */
function combinationEquals(a: KeyCombination, b: KeyCombination): boolean {
  return (
    a.baseKey === b.baseKey &&
    a.modifiers.ctrl === b.modifiers.ctrl &&
    a.modifiers.alt === b.modifiers.alt &&
    a.modifiers.shift === b.modifiers.shift &&
    a.modifiers.meta === b.modifiers.meta
  );
}

/**
 * Determines which category a prompt belongs to by checking KEY_PROMPTS_BY_CATEGORY.
 * Returns the first matching category or null if not found.
 */
function getCategoryForPrompt(prompt: KeyCombination): KeyCategory | null {
  for (const category of ALL_CATEGORIES) {
    const categoryPrompts = KEY_PROMPTS_BY_CATEGORY[category];
    if (categoryPrompts.some((p) => combinationEquals(p, prompt))) {
      return category;
    }
  }
  return null;
}

/**
 * Arbitrary for generating random counts between 20 and 100.
 * The implementation distributes count/5 per category, so we use multiples
 * and non-multiples to test both exact and remainder distribution.
 */
const countArb = fc.integer({ min: 20, max: 100 });

describe('Prompt Selector - Property 6: Mixed-mode draws from all categories with approximately equal probability', () => {
  it('should distribute prompts approximately equally across all categories', () => {
    fc.assert(
      fc.property(countArb, (count) => {
        const result = getMixedPrompts(count);

        // Total prompts returned should equal the requested count
        if (result.prompts.length !== count) {
          throw new Error(
            `Expected ${count} prompts but got ${result.prompts.length}`
          );
        }

        // Count prompts per category
        const categoryCounts: Record<string, number> = {};
        for (const category of ALL_CATEGORIES) {
          categoryCounts[category] = 0;
        }

        for (const prompt of result.prompts) {
          const category = getCategoryForPrompt(prompt);
          if (category === null) {
            throw new Error(
              `Prompt with baseKey="${prompt.baseKey}" does not belong to any known category`
            );
          }
          categoryCounts[category]++;
        }

        // The implementation distributes count equally: each category gets
        // floor(count / numCategories) prompts, with remainder distributed one each
        // to the first categories. So each category should have approximately
        // count/numCategories prompts (±1 for remainder distribution).
        const expectedPerCategory = count / NUM_CATEGORIES;
        const tolerance = expectedPerCategory * 0.20; // ±20% of uniform proportion

        for (const category of ALL_CATEGORIES) {
          const actual = categoryCounts[category];
          const lowerBound = expectedPerCategory - tolerance;
          const upperBound = expectedPerCategory + tolerance;

          if (actual < lowerBound || actual > upperBound) {
            throw new Error(
              `Category "${category}" has ${actual} prompts, expected approximately ${expectedPerCategory.toFixed(1)} (±20% tolerance: [${lowerBound.toFixed(1)}, ${upperBound.toFixed(1)}])`
            );
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

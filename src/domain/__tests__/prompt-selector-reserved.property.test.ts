// Feature: modifier-key-trainer, Property 24: OS-reserved combinations are never presented for user input
// **Validates: Requirements 8.3**

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { getPromptsForCategory } from '../prompt-selector';
import { OS_RESERVED_COMBINATIONS, isOsReserved } from '../../data/os-reserved';
import { KEY_PROMPTS_BY_CATEGORY } from '../../data/key-prompts';
import type { KeyCategory, KeyCombination } from '../types';

/**
 * All available categories for selection.
 */
const ALL_CATEGORIES: KeyCategory[] = [
  'modifiers',
  'numbers',
  'function-keys',
  'navigation',
  'combinations',
];

/**
 * Arbitrary for generating a random category.
 */
const categoryArb = fc.constantFrom<KeyCategory>(...ALL_CATEGORIES);

/**
 * Arbitrary for generating a random prompt count between 5 and 50.
 */
const countArb = fc.integer({ min: 5, max: 50 });

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

describe('Prompt Selector - Property 24: OS-reserved combinations are never presented for user input', () => {
  it('should never return OS-reserved combinations in the prompts list', () => {
    fc.assert(
      fc.property(categoryArb, countArb, (category, count) => {
        const result = getPromptsForCategory(category, count);

        // Verify NONE of the returned prompts are OS-reserved
        for (const prompt of result.prompts) {
          if (isOsReserved(prompt)) {
            throw new Error(
              `OS-reserved combination was presented for user input: baseKey="${prompt.baseKey}" ` +
              `modifiers={ctrl:${prompt.modifiers.ctrl}, alt:${prompt.modifiers.alt}, ` +
              `shift:${prompt.modifiers.shift}, meta:${prompt.modifiers.meta}}`
            );
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should include OS-reserved combos in skippedReserved when category pool contains them', () => {
    fc.assert(
      fc.property(categoryArb, countArb, (category, count) => {
        const result = getPromptsForCategory(category, count);

        // Find all OS-reserved combinations that exist in this category's pool
        const categoryPrompts = KEY_PROMPTS_BY_CATEGORY[category];
        const reservedInPool = categoryPrompts.filter((prompt) => isOsReserved(prompt));

        // If the category pool contains OS-reserved combos, they must appear in skippedReserved
        for (const reserved of reservedInPool) {
          const foundInSkipped = result.skippedReserved.some((skipped) =>
            combinationEquals(skipped, reserved)
          );
          if (!foundInSkipped) {
            throw new Error(
              `OS-reserved combination in category pool was not reported in skippedReserved: ` +
              `baseKey="${reserved.baseKey}" modifiers={ctrl:${reserved.modifiers.ctrl}, ` +
              `alt:${reserved.modifiers.alt}, shift:${reserved.modifiers.shift}, ` +
              `meta:${reserved.modifiers.meta}}`
            );
          }
        }

        // Also verify that skippedReserved only contains actual OS-reserved combinations
        for (const skipped of result.skippedReserved) {
          if (!isOsReserved(skipped)) {
            throw new Error(
              `Non-reserved combination found in skippedReserved: baseKey="${skipped.baseKey}"`
            );
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

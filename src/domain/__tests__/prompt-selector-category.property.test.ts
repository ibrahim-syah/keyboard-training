// Feature: modifier-key-trainer, Property 5: Category filter returns only prompts from selected category
// **Validates: Requirements 2.3**

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { getPromptsForCategory } from '../prompt-selector';
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
 * Arbitrary for generating a random category from the 5 available categories.
 */
const categoryArb = fc.constantFrom<KeyCategory>(...ALL_CATEGORIES);

/**
 * Arbitrary for generating a random prompt count between 5 and 30.
 */
const countArb = fc.integer({ min: 5, max: 30 });

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
 * Helper to check if a prompt exists in a category's prompt list.
 */
function promptExistsInCategory(prompt: KeyCombination, category: KeyCategory): boolean {
  return KEY_PROMPTS_BY_CATEGORY[category].some((p) => combinationEquals(p, prompt));
}

describe('Prompt Selector - Property 5: Category filter returns only prompts from selected category', () => {
  it('should return only prompts that belong to the selected category', () => {
    fc.assert(
      fc.property(categoryArb, countArb, (category, count) => {
        const result = getPromptsForCategory(category, count);

        // Verify ALL returned prompts exist in the selected category's prompt list
        for (const prompt of result.prompts) {
          if (!promptExistsInCategory(prompt, category)) {
            throw new Error(
              `Prompt with baseKey="${prompt.baseKey}" does not belong to category "${category}"`
            );
          }
        }

        // Verify NO returned prompt exists exclusively in another category
        // (i.e., each prompt must be found in the selected category's list)
        const otherCategories = ALL_CATEGORIES.filter((c) => c !== category);
        for (const prompt of result.prompts) {
          const inSelectedCategory = promptExistsInCategory(prompt, category);
          if (!inSelectedCategory) {
            // Check if it only exists in other categories
            const foundInOther = otherCategories.some((other) =>
              promptExistsInCategory(prompt, other)
            );
            if (foundInOther) {
              throw new Error(
                `Prompt with baseKey="${prompt.baseKey}" belongs exclusively to another category, not "${category}"`
              );
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

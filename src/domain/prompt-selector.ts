import type { KeyCombination, KeyCategory } from './types';
import { KEY_PROMPTS_BY_CATEGORY } from '../data/key-prompts';
import { isOsReserved } from '../data/os-reserved';

/**
 * Result of prompt selection including selected prompts and any skip notices
 * for OS-reserved combinations that were filtered out.
 */
export interface PromptSelectionResult {
  prompts: KeyCombination[];
  skippedReserved: KeyCombination[];
}

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

/**
 * Filters out OS-reserved combinations from a list of prompts.
 * Returns both the available prompts and the skipped reserved ones.
 */
function filterReserved(prompts: KeyCombination[]): {
  available: KeyCombination[];
  reserved: KeyCombination[];
} {
  const available: KeyCombination[] = [];
  const reserved: KeyCombination[] = [];

  for (const prompt of prompts) {
    if (isOsReserved(prompt)) {
      reserved.push(prompt);
    } else {
      available.push(prompt);
    }
  }

  return { available, reserved };
}

/**
 * Randomly selects `count` prompts from the given array.
 * Uses sampling with replacement if the pool is smaller than count.
 */
function selectRandom(pool: KeyCombination[], count: number): KeyCombination[] {
  if (pool.length === 0) return [];

  const selected: KeyCombination[] = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool[index]);
  }
  return selected;
}

/**
 * Returns prompts for a specific category, filtering out OS-reserved combinations.
 * Randomly selects `count` prompts from the available pool (with replacement if needed).
 *
 * Requirements: 2.3, 8.3
 */
export function getPromptsForCategory(
  category: KeyCategory,
  count: number
): PromptSelectionResult {
  const allPrompts = KEY_PROMPTS_BY_CATEGORY[category];
  const { available, reserved } = filterReserved(allPrompts);

  const prompts = selectRandom(available, count);

  return {
    prompts,
    skippedReserved: reserved,
  };
}

/**
 * Returns prompts drawn from all categories with equal probability per category.
 * Distributes `count` equally across all categories in round-robin fashion,
 * filtering out OS-reserved combinations from each category.
 *
 * Requirements: 2.4, 8.3
 */
export function getMixedPrompts(count: number): PromptSelectionResult {
  const allSkipped: KeyCombination[] = [];
  const allPrompts: KeyCombination[] = [];

  // Calculate how many prompts per category
  const categoryCount = ALL_CATEGORIES.length;
  const basePerCategory = Math.floor(count / categoryCount);
  let remainder = count - basePerCategory * categoryCount;

  for (const category of ALL_CATEGORIES) {
    const categoryPrompts = KEY_PROMPTS_BY_CATEGORY[category];
    const { available, reserved } = filterReserved(categoryPrompts);

    allSkipped.push(...reserved);

    // Each category gets basePerCategory, plus 1 extra if remainder > 0
    const categoryAllocation = basePerCategory + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

    const selected = selectRandom(available, categoryAllocation);
    allPrompts.push(...selected);
  }

  // Shuffle the final prompts so categories are interleaved
  for (let i = allPrompts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPrompts[i], allPrompts[j]] = [allPrompts[j], allPrompts[i]];
  }

  return {
    prompts: allPrompts,
    skippedReserved: allSkipped,
  };
}

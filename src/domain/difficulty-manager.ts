/**
 * Difficulty Manager for the Modifier Key Trainer application.
 *
 * Manages difficulty level progression per category, determines which prompts
 * are available based on unlocked levels, and supports manual override.
 *
 * Level classification:
 * - Level 1: 2-key combinations using Cmd (meta) or Shift
 * - Level 2: 2-key combinations using Ctrl or Alt
 * - Level 3: 3-key combinations (2 modifiers + base)
 * - Level 4: 4-key combinations (3 modifiers + base)
 *
 * Progression criteria: accuracy > 0.9 AND avgResponseTimeMs < 1000 AND attempts >= 20
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import type {
  KeyCategory,
  KeyCombination,
  DifficultyLevel,
  CategoryProgress,
} from './types';
import { get, set } from '../infrastructure/storage-adapter';
import {
  COMBINATION_PROMPTS_LEVEL_1,
  COMBINATION_PROMPTS_LEVEL_2,
  COMBINATION_PROMPTS_LEVEL_3,
  COMBINATION_PROMPTS_LEVEL_4,
  KEY_PROMPTS_BY_CATEGORY,
} from '../data/key-prompts';

const CATEGORY_PROGRESS_KEY = 'category_progress';

/** Progression criteria thresholds */
const PROGRESSION_CRITERIA = {
  minAccuracy: 0.9,
  maxResponseTimeMs: 1000,
  minAttempts: 20,
} as const;

/** Stats required for checking progression */
export interface LevelStats {
  accuracy: number;
  avgResponseTimeMs: number;
  attempts: number;
}

/**
 * Count the total number of keys in a combination.
 * Total keys = number of active modifiers + 1 (base key).
 */
export function countTotalKeys(combination: KeyCombination): number {
  const mods = combination.modifiers;
  let count = 0;
  if (mods.ctrl) count++;
  if (mods.alt) count++;
  if (mods.shift) count++;
  if (mods.meta) count++;
  // Add base key
  count += 1;
  return count;
}

/**
 * Classify a key combination into a difficulty level.
 *
 * - Level 1: 2 keys total where modifier is Cmd (meta) or Shift
 * - Level 2: 2 keys total where modifier is Ctrl or Alt
 * - Level 3: 3 keys total (2 modifiers + base)
 * - Level 4: 4 keys total (3 modifiers + base)
 *
 * Returns null for single-key prompts (no modifiers).
 */
export function classifyLevel(combination: KeyCombination): DifficultyLevel | null {
  const totalKeys = countTotalKeys(combination);

  if (totalKeys === 1) {
    // Single key, no difficulty level
    return null;
  }

  if (totalKeys === 2) {
    const mods = combination.modifiers;
    // Level 1: Cmd or Shift
    if (mods.meta || mods.shift) {
      return 1;
    }
    // Level 2: Ctrl or Alt
    if (mods.ctrl || mods.alt) {
      return 2;
    }
  }

  if (totalKeys === 3) {
    return 3;
  }

  if (totalKeys >= 4) {
    return 4;
  }

  return null;
}

/**
 * Get the default category progress for a new category.
 */
function getDefaultProgress(): CategoryProgress {
  return {
    currentLevel: 1,
    unlockedLevels: [1],
    manualOverride: false,
    levelStats: {
      1: { accuracy: 0, avgResponseTimeMs: 0, attempts: 0 },
      2: { accuracy: 0, avgResponseTimeMs: 0, attempts: 0 },
      3: { accuracy: 0, avgResponseTimeMs: 0, attempts: 0 },
      4: { accuracy: 0, avgResponseTimeMs: 0, attempts: 0 },
    },
  };
}

/**
 * Load all category progress from storage.
 */
function loadAllProgress(): Record<KeyCategory, CategoryProgress> {
  return get<Record<KeyCategory, CategoryProgress>>(CATEGORY_PROGRESS_KEY, {
    'modifiers': getDefaultProgress(),
    'numbers': getDefaultProgress(),
    'function-keys': getDefaultProgress(),
    'navigation': getDefaultProgress(),
    'combinations': getDefaultProgress(),
  });
}

/**
 * Load progress for a specific category from storage.
 */
function loadProgress(category: KeyCategory): CategoryProgress {
  const allProgress = loadAllProgress();
  return allProgress[category] ?? getDefaultProgress();
}

/**
 * Save progress for a specific category to storage.
 */
function saveProgress(category: KeyCategory, progress: CategoryProgress): void {
  const allProgress = loadAllProgress();
  allProgress[category] = progress;
  set(CATEGORY_PROGRESS_KEY, allProgress);
}

/**
 * Check if a category has any prior training history (attempts > 0 in any level).
 */
function hasHistory(progress: CategoryProgress): boolean {
  return Object.values(progress.levelStats).some((s) => s.attempts > 0);
}

/**
 * Get available difficulty levels for a category.
 * Returns unlocked levels, or all levels if manual override is active.
 */
export function getAvailableLevels(category: KeyCategory): DifficultyLevel[] {
  const progress = loadProgress(category);

  if (progress.manualOverride) {
    return [1, 2, 3, 4];
  }

  return [...progress.unlockedLevels].sort((a, b) => a - b);
}

/**
 * Check progression criteria and unlock the next level if met.
 *
 * Criteria: accuracy > 0.9 AND avgResponseTimeMs < 1000 AND attempts >= 20
 *
 * Returns true if a new level was unlocked, false otherwise.
 */
export function checkProgression(category: KeyCategory, stats: LevelStats): boolean {
  const progress = loadProgress(category);

  const meetsAccuracy = stats.accuracy > PROGRESSION_CRITERIA.minAccuracy;
  const meetsSpeed = stats.avgResponseTimeMs < PROGRESSION_CRITERIA.maxResponseTimeMs;
  const meetsAttempts = stats.attempts >= PROGRESSION_CRITERIA.minAttempts;

  if (!meetsAccuracy || !meetsSpeed || !meetsAttempts) {
    return false;
  }

  // Determine next level to unlock
  const currentMax = Math.max(...progress.unlockedLevels) as DifficultyLevel;
  if (currentMax >= 4) {
    // Already at max level
    return false;
  }

  const nextLevel = (currentMax + 1) as DifficultyLevel;

  // Unlock the next level
  if (!progress.unlockedLevels.includes(nextLevel)) {
    progress.unlockedLevels.push(nextLevel);
    progress.currentLevel = nextLevel;
    saveProgress(category, progress);
    return true;
  }

  return false;
}

/**
 * Unlock a specific level for a category.
 */
export function unlockLevel(category: KeyCategory, level: DifficultyLevel): void {
  const progress = loadProgress(category);

  if (!progress.unlockedLevels.includes(level)) {
    progress.unlockedLevels.push(level);
    progress.unlockedLevels.sort((a, b) => a - b);
  }

  progress.currentLevel = level;
  saveProgress(category, progress);
}

/**
 * Enable manual override for a category, allowing access to any level.
 */
export function overrideAll(category: KeyCategory): void {
  const progress = loadProgress(category);
  progress.manualOverride = true;
  saveProgress(category, progress);
}

/**
 * Get single-key prompts for a category (prompts with no modifiers).
 */
function getSingleKeyPrompts(category: KeyCategory): KeyCombination[] {
  const allPrompts = KEY_PROMPTS_BY_CATEGORY[category];
  return allPrompts.filter((p) => {
    const mods = p.modifiers;
    return !mods.ctrl && !mods.alt && !mods.shift && !mods.meta;
  });
}

/**
 * Get prompts for a specific difficulty level within a category.
 *
 * For the 'combinations' category, returns prompts from the corresponding
 * level arrays (LEVEL_1 through LEVEL_4).
 *
 * For other categories, classifies each prompt and returns those matching
 * the requested level.
 *
 * For new categories with no history, returns single-key prompts first
 * (up to 10) before introducing level-based combinations.
 */
export function getPromptsForLevel(
  category: KeyCategory,
  level: DifficultyLevel,
): KeyCombination[] {
  const progress = loadProgress(category);

  // For new categories (no history), provide single-key prompts
  if (!hasHistory(progress)) {
    const singleKeyPrompts = getSingleKeyPrompts(category);
    if (singleKeyPrompts.length > 0) {
      return singleKeyPrompts.slice(0, 10);
    }
  }

  // For the 'combinations' category, use the pre-organized level arrays
  if (category === 'combinations') {
    switch (level) {
      case 1:
        return [...COMBINATION_PROMPTS_LEVEL_1];
      case 2:
        return [...COMBINATION_PROMPTS_LEVEL_2];
      case 3:
        return [...COMBINATION_PROMPTS_LEVEL_3];
      case 4:
        return [...COMBINATION_PROMPTS_LEVEL_4];
    }
  }

  // For other categories, classify each prompt and return matching ones
  const allPrompts = KEY_PROMPTS_BY_CATEGORY[category];
  return allPrompts.filter((p) => classifyLevel(p) === level);
}

/**
 * Get the current progress state for a category.
 */
export function getCategoryProgress(category: KeyCategory): CategoryProgress {
  return loadProgress(category);
}

/**
 * Update level stats for a category (used after completing exercises).
 */
export function updateLevelStats(
  category: KeyCategory,
  level: DifficultyLevel,
  stats: LevelStats,
): void {
  const progress = loadProgress(category);
  progress.levelStats[level] = {
    accuracy: stats.accuracy,
    avgResponseTimeMs: stats.avgResponseTimeMs,
    attempts: stats.attempts,
  };
  saveProgress(category, progress);
}

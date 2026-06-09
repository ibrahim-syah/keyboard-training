import { useState, useCallback, useMemo } from 'react';
import type { KeyCategory, DifficultyLevel, KeyCombination, CategoryProgress } from '../domain/types';
import {
  getAvailableLevels,
  checkProgression,
  overrideAll,
  getPromptsForLevel,
  getCategoryProgress,
} from '../domain/difficulty-manager';
import type { LevelStats } from '../domain/difficulty-manager';

/**
 * React hook wrapping DifficultyManager state for a given category.
 *
 * Provides access to available levels, progress data, progression
 * checks, and level override functionality.
 */
export function useDifficulty(category: KeyCategory) {
  const [refreshCounter, setRefreshCounter] = useState(0);

  const availableLevels = useMemo((): DifficultyLevel[] => {
    void refreshCounter;
    return getAvailableLevels(category);
  }, [category, refreshCounter]);

  const progress = useMemo((): CategoryProgress => {
    void refreshCounter;
    return getCategoryProgress(category);
  }, [category, refreshCounter]);

  const checkProgressionForCategory = useCallback(
    (stats: LevelStats): boolean => {
      const result = checkProgression(category, stats);
      if (result) {
        setRefreshCounter((c) => c + 1);
      }
      return result;
    },
    [category],
  );

  const override = useCallback((): void => {
    overrideAll(category);
    setRefreshCounter((c) => c + 1);
  }, [category]);

  const promptsForLevel = useCallback(
    (level: DifficultyLevel): KeyCombination[] => {
      return getPromptsForLevel(category, level);
    },
    [category],
  );

  return {
    availableLevels,
    progress,
    checkProgression: checkProgressionForCategory,
    override,
    promptsForLevel,
  };
}

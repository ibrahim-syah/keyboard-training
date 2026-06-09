import { useState, useCallback, useMemo } from 'react';
import type { SessionRecord, CombinationStat, KeyCategory } from '../domain/types';
import {
  getSessions,
  getWeakestCombinations,
  getProficiencyRating,
  isStorageAvailable,
} from '../domain/progress-tracker';

/**
 * React hook wrapping ProgressTracker queries.
 *
 * Provides reactive access to session history, weakest combinations,
 * proficiency ratings, and storage availability.
 */
export function useProgress() {
  // Use a counter to trigger re-fetches when sessions change
  const [refreshCounter, setRefreshCounter] = useState(0);

  const storageAvailable = useMemo(() => isStorageAvailable(), []);

  const sessions = useCallback(
    (category?: KeyCategory, days?: number): SessionRecord[] => {
      // refreshCounter is referenced to tie cache invalidation
      void refreshCounter;
      return getSessions(category, days);
    },
    [refreshCounter],
  );

  const weakest = useCallback(
    (limit: number): CombinationStat[] => {
      void refreshCounter;
      return getWeakestCombinations(limit);
    },
    [refreshCounter],
  );

  const proficiency = useCallback(
    (category: KeyCategory): number | null => {
      void refreshCounter;
      return getProficiencyRating(category);
    },
    [refreshCounter],
  );

  const refresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  return {
    sessions,
    weakest,
    proficiency,
    storageAvailable,
    refresh,
  };
}

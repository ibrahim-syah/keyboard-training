/**
 * Progress Tracker for the Modifier Key Trainer application.
 *
 * Persists session history and provides statistics for trend visualization,
 * weakest combination identification, and proficiency ratings.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import type {
  SessionRecord,
  CombinationStat,
  KeyCategory,
} from './types';
import { get, set, isAvailable } from '../infrastructure/storage-adapter';

const SESSIONS_KEY = 'sessions';

/**
 * Save a completed session record to localStorage.
 * Returns true on success, false if storage is unavailable or write fails.
 */
export function saveSession(record: SessionRecord): boolean {
  if (!isAvailable()) {
    return false;
  }

  const sessions = get<SessionRecord[]>(SESSIONS_KEY, []);
  sessions.push(record);
  return set(SESSIONS_KEY, sessions);
}

/**
 * Retrieve session records, optionally filtered by category and/or date range.
 *
 * @param category - If provided, only return sessions for this category
 * @param days - If provided, only return sessions within the last N days
 */
export function getSessions(
  category?: KeyCategory,
  days?: number,
): SessionRecord[] {
  const sessions = get<SessionRecord[]>(SESSIONS_KEY, []);

  let filtered = sessions;

  if (category !== undefined) {
    filtered = filtered.filter((s) => s.category === category);
  }

  if (days !== undefined) {
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((s) => new Date(s.date).getTime() >= cutoff);
  }

  return filtered;
}

/**
 * Get the weakest key combinations across all sessions, ranked by lowest
 * accuracy (correctCount / attempts). Ties are broken by slowest average
 * response time (descending).
 *
 * @param limit - Maximum number of combinations to return
 */
export function getWeakestCombinations(limit: number): CombinationStat[] {
  const sessions = get<SessionRecord[]>(SESSIONS_KEY, []);

  // Aggregate combination stats across all sessions.
  // Use a string key derived from the combination for grouping.
  const aggregated = new Map<
    string,
    { attempts: number; correctCount: number; totalResponseTimeMs: number }
  >();

  for (const session of sessions) {
    for (const stat of session.perCombinationData) {
      const key = combinationKey(stat.combination);
      const existing = aggregated.get(key);
      if (existing) {
        existing.attempts += stat.attempts;
        existing.correctCount += stat.correctCount;
        existing.totalResponseTimeMs +=
          stat.avgResponseTimeMs * stat.attempts;
      } else {
        aggregated.set(key, {
          attempts: stat.attempts,
          correctCount: stat.correctCount,
          totalResponseTimeMs: stat.avgResponseTimeMs * stat.attempts,
        });
      }
    }
  }

  // Build CombinationStat array with aggregated values
  const combinationStats: CombinationStat[] = [];

  // We need the original combination objects. Rebuild from sessions.
  const combinationMap = new Map<string, CombinationStat['combination']>();
  for (const session of sessions) {
    for (const stat of session.perCombinationData) {
      const key = combinationKey(stat.combination);
      if (!combinationMap.has(key)) {
        combinationMap.set(key, stat.combination);
      }
    }
  }

  for (const [key, agg] of aggregated.entries()) {
    const combination = combinationMap.get(key);
    if (combination) {
      combinationStats.push({
        combination,
        attempts: agg.attempts,
        correctCount: agg.correctCount,
        avgResponseTimeMs:
          agg.attempts > 0 ? agg.totalResponseTimeMs / agg.attempts : 0,
      });
    }
  }

  // Sort by accuracy ascending, then by avgResponseTimeMs descending (slowest first)
  combinationStats.sort((a, b) => {
    const accuracyA =
      a.attempts > 0 ? a.correctCount / a.attempts : 0;
    const accuracyB =
      b.attempts > 0 ? b.correctCount / b.attempts : 0;

    if (accuracyA !== accuracyB) {
      return accuracyA - accuracyB;
    }

    // Ties broken by slowest response time (descending)
    return b.avgResponseTimeMs - a.avgResponseTimeMs;
  });

  return combinationStats.slice(0, limit);
}

/**
 * Calculate the proficiency rating (1-5 stars) for a given category.
 *
 * Star thresholds:
 * - 1★: accuracy < 50%
 * - 2★: accuracy >= 50% and < 70%
 * - 3★: accuracy >= 70% and < 85%
 * - 4★: accuracy >= 85% and < 95%
 * - 5★: accuracy >= 95% AND avgResponseTime < 1000ms
 * - If accuracy >= 95% but avgResponseTime >= 1000ms → 4★
 *
 * Returns null if fewer than 5 sessions exist for the category.
 */
export function getProficiencyRating(category: KeyCategory): number | null {
  const sessions = getSessions(category);

  if (sessions.length < 5) {
    return null;
  }

  // Calculate average accuracy and average response time across sessions
  const totalAccuracy = sessions.reduce((sum, s) => sum + s.accuracy, 0);
  const totalResponseTime = sessions.reduce(
    (sum, s) => sum + s.avgResponseTimeMs,
    0,
  );

  const avgAccuracy = totalAccuracy / sessions.length;
  const avgResponseTime = totalResponseTime / sessions.length;

  // Convert accuracy to percentage for threshold comparison
  // Accuracy is stored as a decimal (0-1)
  const accuracyPercent = avgAccuracy * 100;

  if (accuracyPercent >= 95) {
    if (avgResponseTime < 1000) {
      return 5;
    }
    return 4;
  }

  if (accuracyPercent >= 85) {
    return 4;
  }

  if (accuracyPercent >= 70) {
    return 3;
  }

  if (accuracyPercent >= 50) {
    return 2;
  }

  return 1;
}

/**
 * Check whether localStorage is available for progress persistence.
 */
export function isStorageAvailable(): boolean {
  return isAvailable();
}

/**
 * Generate a unique string key for a KeyCombination to use in Maps.
 */
function combinationKey(
  combination: CombinationStat['combination'],
): string {
  const mods = combination.modifiers;
  const modStr = [
    mods.ctrl ? 'ctrl' : '',
    mods.alt ? 'alt' : '',
    mods.shift ? 'shift' : '',
    mods.meta ? 'meta' : '',
  ]
    .filter(Boolean)
    .join('+');

  return modStr ? `${modStr}+${combination.baseKey}` : combination.baseKey;
}

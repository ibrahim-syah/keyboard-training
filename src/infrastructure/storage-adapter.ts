/**
 * LocalStorage adapter for the Modifier Key Trainer application.
 *
 * All keys are namespaced with the `mkt_` prefix.
 * Reads are wrapped in try/catch with fallback to defaults.
 * Handles QuotaExceededError by pruning sessions older than 90 days.
 *
 * Validates: Requirements 5.1, 5.5
 */

import type { SessionRecord } from '../domain/types';

const KEY_PREFIX = 'mkt_';
const SESSIONS_KEY = 'sessions';
const SESSION_MAX_AGE_DAYS = 90;

/**
 * Check if localStorage is accessible in the current environment.
 */
export function isAvailable(): boolean {
  try {
    const testKey = `${KEY_PREFIX}__storage_test__`;
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a value from localStorage with the `mkt_` prefix.
 * Returns the parsed JSON value, or the defaultValue on any failure.
 */
export function get<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${key}`);
    if (raw === null) {
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Write a value to localStorage with the `mkt_` prefix.
 * Returns true on success, false on failure.
 * On QuotaExceededError, attempts to prune old sessions and retry once.
 */
export function set<T>(key: string, value: T): boolean {
  const prefixedKey = `${KEY_PREFIX}${key}`;
  const serialized = JSON.stringify(value);

  try {
    localStorage.setItem(prefixedKey, serialized);
    return true;
  } catch (error: unknown) {
    if (isQuotaExceededError(error)) {
      const pruned = pruneOldSessions();
      if (pruned) {
        try {
          localStorage.setItem(prefixedKey, serialized);
          return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  }
}

/**
 * Remove a value from localStorage with the `mkt_` prefix.
 */
export function remove(key: string): void {
  try {
    localStorage.removeItem(`${KEY_PREFIX}${key}`);
  } catch {
    // Silently ignore removal errors
  }
}

/**
 * Determine if an error is a QuotaExceededError.
 */
function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof DOMException) {
    // Most browsers use code 22 or name "QuotaExceededError"
    return error.code === 22 || error.name === 'QuotaExceededError';
  }
  return false;
}

/**
 * Prune sessions older than 90 days from localStorage.
 * Returns true if any sessions were removed.
 */
function pruneOldSessions(): boolean {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${SESSIONS_KEY}`);
    if (raw === null) {
      return false;
    }

    const sessions: SessionRecord[] = JSON.parse(raw);
    if (!Array.isArray(sessions)) {
      return false;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - SESSION_MAX_AGE_DAYS);
    const cutoffTime = cutoffDate.getTime();

    const recentSessions = sessions.filter((session) => {
      const sessionTime = new Date(session.date).getTime();
      return sessionTime >= cutoffTime;
    });

    if (recentSessions.length === sessions.length) {
      return false; // Nothing to prune
    }

    localStorage.setItem(
      `${KEY_PREFIX}${SESSIONS_KEY}`,
      JSON.stringify(recentSessions),
    );
    return true;
  } catch {
    return false;
  }
}

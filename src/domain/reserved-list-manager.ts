/**
 * ReservedListManager - Pure domain functions for managing user-customizable reserved combinations.
 *
 * This module provides stateless, pure functions that compute the effective reserved list
 * by merging default combinations with user overrides (additions and removals).
 *
 * Requirements: 1.3, 2.1, 2.2, 3.1, 4.1, 4.2, 4.3, 4.4, 5.1, 7.1, 7.2, 7.3
 */

import type { KeyCombination } from './types';
import * as storage from '../infrastructure/storage-adapter';

/**
 * User customizations to the reserved list, stored as additions and removals
 * relative to the default reserved list.
 */
export interface UserOverrides {
  additions: KeyCombination[];
  removals: KeyCombination[];
}

/**
 * Checks whether two KeyCombinations are equal by comparing all four modifier
 * booleans and the baseKey string.
 */
function combinationsEqual(a: KeyCombination, b: KeyCombination): boolean {
  return (
    a.baseKey === b.baseKey &&
    a.modifiers.ctrl === b.modifiers.ctrl &&
    a.modifiers.alt === b.modifiers.alt &&
    a.modifiers.shift === b.modifiers.shift &&
    a.modifiers.meta === b.modifiers.meta
  );
}

/**
 * Computes the effective reserved list from defaults and user overrides.
 *
 * effective = (defaults ∪ additions) ∖ removals
 *
 * Requirements: 1.3
 */
export function getEffectiveList(
  defaults: KeyCombination[],
  overrides: UserOverrides,
): KeyCombination[] {
  // Union: defaults + additions (avoiding duplicates)
  const union: KeyCombination[] = [...defaults];
  for (const addition of overrides.additions) {
    const alreadyExists = union.some((combo) => combinationsEqual(combo, addition));
    if (!alreadyExists) {
      union.push(addition);
    }
  }

  // Subtract removals
  return union.filter(
    (combo) => !overrides.removals.some((removal) => combinationsEqual(combo, removal)),
  );
}

/**
 * Checks whether a combination is in the effective reserved list using deep equality.
 *
 * Requirements: 1.3
 */
export function isReserved(
  combo: KeyCombination,
  effectiveList: KeyCombination[],
): boolean {
  return effectiveList.some((reserved) => combinationsEqual(reserved, combo));
}

/**
 * Adds a combination to user overrides. Returns a new UserOverrides object (immutable).
 *
 * Rejects duplicates: if the combination already exists in the effective reserved list
 * (defaults + current additions - removals), returns the overrides unchanged.
 *
 * Requirements: 2.1, 2.2
 */
export function addCombination(
  overrides: UserOverrides,
  combo: KeyCombination,
  defaults: KeyCombination[],
): UserOverrides {
  const effectiveList = getEffectiveList(defaults, overrides);

  // Reject if already in effective list
  if (isReserved(combo, effectiveList)) {
    return overrides;
  }

  return {
    additions: [...overrides.additions, combo],
    removals: overrides.removals,
  };
}

/**
 * Removes a combination from the effective reserved list.
 *
 * Behavior depends on the source of the combination:
 * - Default combo: adds to `removals` array
 * - User-added combo: removes from `additions` array
 *
 * If the combination is not in the effective list, returns overrides unchanged (no-op).
 *
 * Requirements: 3.1
 */
export function removeCombination(
  overrides: UserOverrides,
  combo: KeyCombination,
  defaults: KeyCombination[],
): UserOverrides {
  const effectiveList = getEffectiveList(defaults, overrides);

  // If not in effective list, no-op
  if (!isReserved(combo, effectiveList)) {
    return overrides;
  }

  // Check if it's a user-added combination
  const isUserAdded = overrides.additions.some((addition) =>
    combinationsEqual(addition, combo),
  );

  if (isUserAdded) {
    // Remove from additions
    return {
      additions: overrides.additions.filter(
        (addition) => !combinationsEqual(addition, combo),
      ),
      removals: overrides.removals,
    };
  }

  // It's a default combo — add to removals
  return {
    additions: overrides.additions,
    removals: [...overrides.removals, combo],
  };
}

/**
 * Returns empty overrides, effectively resetting to defaults.
 *
 * Requirements: 1.3
 */
export function resetOverrides(): UserOverrides {
  return { additions: [], removals: [] };
}

// --- Serialization Functions ---

const STORAGE_KEY = 'reserved_overrides';

/**
 * Serializes UserOverrides to a JSON string.
 *
 * Requirements: 7.1
 */
export function serializeOverrides(overrides: UserOverrides): string {
  return JSON.stringify(overrides);
}

/**
 * Validates whether a value is a valid KeyCombination object.
 */
function isValidKeyCombination(value: unknown): value is KeyCombination {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;

  if (typeof obj.baseKey !== 'string') {
    return false;
  }

  if (typeof obj.modifiers !== 'object' || obj.modifiers === null) {
    return false;
  }

  const mods = obj.modifiers as Record<string, unknown>;
  return (
    typeof mods.ctrl === 'boolean' &&
    typeof mods.alt === 'boolean' &&
    typeof mods.shift === 'boolean' &&
    typeof mods.meta === 'boolean'
  );
}

/**
 * Deserializes a JSON string into a validated UserOverrides object.
 * Returns null if the JSON is invalid or does not conform to the expected schema.
 *
 * Requirements: 7.2, 7.3
 */
export function deserializeOverrides(json: string): UserOverrides | null {
  try {
    const parsed: unknown = JSON.parse(json);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const obj = parsed as Record<string, unknown>;

    if (!Array.isArray(obj.additions) || !Array.isArray(obj.removals)) {
      return null;
    }

    for (const item of obj.additions) {
      if (!isValidKeyCombination(item)) {
        return null;
      }
    }

    for (const item of obj.removals) {
      if (!isValidKeyCombination(item)) {
        return null;
      }
    }

    return {
      additions: obj.additions as KeyCombination[],
      removals: obj.removals as KeyCombination[],
    };
  } catch {
    return null;
  }
}

// --- Persistence Functions ---

/**
 * Loads user overrides from localStorage via the storage adapter.
 * Falls back to empty overrides if storage is unavailable or data is invalid.
 *
 * Requirements: 4.2, 4.3
 */
export function loadOverrides(): UserOverrides {
  const raw = storage.get<unknown>(STORAGE_KEY, null);

  if (raw === null) {
    return resetOverrides();
  }

  // The storage adapter already parses JSON, so we get back the object directly.
  // We still need to validate its shape.
  const json = JSON.stringify(raw);
  const validated = deserializeOverrides(json);

  return validated ?? resetOverrides();
}

/**
 * Persists user overrides to localStorage via the storage adapter.
 * Returns true on success, false on failure.
 *
 * Requirements: 4.1
 */
export function saveOverrides(overrides: UserOverrides): boolean {
  return storage.set(STORAGE_KEY, overrides);
}

/**
 * Removes user overrides from localStorage, effectively resetting to defaults.
 *
 * Requirements: 5.1
 */
export function clearOverrides(): void {
  storage.remove(STORAGE_KEY);
}

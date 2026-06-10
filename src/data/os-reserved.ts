import type { KeyCombination } from '../domain/types';
import { DEFAULT_RESERVED_COMBINATIONS } from './default-reserved';

/**
 * Backward-compatibility shim.
 * Re-exports the combined default reserved list as OS_RESERVED_COMBINATIONS
 * so existing imports continue to work.
 *
 * @deprecated Use `DEFAULT_RESERVED_COMBINATIONS` from `./default-reserved` directly.
 * Requirements: 1.1, 1.2
 */
export { DEFAULT_RESERVED_COMBINATIONS as OS_RESERVED_COMBINATIONS } from './default-reserved';

/**
 * Checks whether a given key combination is reserved (OS or browser level)
 * and cannot be captured.
 *
 * @deprecated Use `isReserved` from `../domain/reserved-list-manager` once available.
 */
export function isOsReserved(combination: KeyCombination): boolean {
  return DEFAULT_RESERVED_COMBINATIONS.some(
    (reserved) =>
      reserved.baseKey === combination.baseKey &&
      reserved.modifiers.ctrl === combination.modifiers.ctrl &&
      reserved.modifiers.alt === combination.modifiers.alt &&
      reserved.modifiers.shift === combination.modifiers.shift &&
      reserved.modifiers.meta === combination.modifiers.meta
  );
}

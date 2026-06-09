import type { KeyCombination, KeyCategory } from '../domain/types';

/**
 * Key prompt data organized by category.
 * Each category contains at least 15 distinct KeyPrompts.
 *
 * Requirements: 2.6
 */

/** Modifier keys alone (single modifier key presses) */
export const MODIFIER_PROMPTS: KeyCombination[] = [
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'ShiftLeft' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'ShiftRight' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'ControlLeft' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'ControlRight' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'AltLeft' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'AltRight' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'MetaLeft' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'MetaRight' },
  { modifiers: { ctrl: true, alt: false, shift: true, meta: false }, baseKey: 'ShiftLeft' },
  { modifiers: { ctrl: true, alt: true, shift: false, meta: false }, baseKey: 'AltLeft' },
  { modifiers: { ctrl: false, alt: true, shift: true, meta: false }, baseKey: 'ShiftLeft' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'ShiftLeft' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: true }, baseKey: 'MetaLeft' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: true }, baseKey: 'MetaLeft' },
  { modifiers: { ctrl: true, alt: true, shift: true, meta: false }, baseKey: 'ShiftLeft' },
  { modifiers: { ctrl: true, alt: false, shift: true, meta: true }, baseKey: 'MetaLeft' },
];

/** Number key prompts (0-9 with various modifiers) */
export const NUMBER_PROMPTS: KeyCombination[] = [
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'Digit0' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'Digit1' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'Digit2' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'Digit3' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'Digit4' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'Digit5' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'Digit6' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'Digit7' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'Digit8' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'Digit9' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'Digit1' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'Digit2' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'Digit3' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'Digit4' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'Digit5' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'Digit1' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'Digit2' },
];

/** Function key prompts (F1-F12) */
export const FUNCTION_KEY_PROMPTS: KeyCombination[] = [
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F1' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F2' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F3' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F4' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F5' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F6' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F7' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F8' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F9' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F10' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F11' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F12' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'F1' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'F5' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'F12' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'F2' },
];

/** Navigation key prompts (arrows, Home, End, Page Up/Down) */
export const NAVIGATION_PROMPTS: KeyCombination[] = [
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'ArrowUp' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'ArrowDown' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'ArrowLeft' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'ArrowRight' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'Home' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'End' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'PageUp' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'PageDown' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'ArrowUp' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'ArrowDown' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'ArrowLeft' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'ArrowRight' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'Home' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'End' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'ArrowUp' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'ArrowDown' },
];

/**
 * Combination prompts organized by difficulty level.
 * Level 1: 2-key with Cmd or Shift
 * Level 2: 2-key with Ctrl or Alt/Option
 * Level 3: 3-key combinations
 * Level 4: 4-key combinations
 */
export const COMBINATION_PROMPTS_LEVEL_1: KeyCombination[] = [
  // Cmd + key (2-key, Level 1)
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyC' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyV' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyX' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyZ' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyA' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyS' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyF' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyW' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyT' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyN' },
  // Shift + key (2-key, Level 1)
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'KeyA' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'KeyB' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'KeyC' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'Tab' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'Enter' },
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyP' },
];

export const COMBINATION_PROMPTS_LEVEL_2: KeyCombination[] = [
  // Ctrl + key (2-key, Level 2)
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyA' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyE' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyK' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyD' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyC' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyL' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyN' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyP' },
  // Alt/Option + key (2-key, Level 2)
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyF' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyB' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyD' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'Delete' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'Backspace' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'ArrowLeft' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'ArrowRight' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'Space' },
];

export const COMBINATION_PROMPTS_LEVEL_3: KeyCombination[] = [
  // 3-key combinations (Level 3)
  { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyP' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyZ' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyS' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyN' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyF' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyK' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: true }, baseKey: 'KeyI' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: true }, baseKey: 'KeyL' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: true }, baseKey: 'KeyF' },
  { modifiers: { ctrl: true, alt: false, shift: true, meta: false }, baseKey: 'KeyK' },
  { modifiers: { ctrl: true, alt: false, shift: true, meta: false }, baseKey: 'KeyM' },
  { modifiers: { ctrl: true, alt: false, shift: true, meta: false }, baseKey: 'Tab' },
  { modifiers: { ctrl: false, alt: true, shift: true, meta: false }, baseKey: 'ArrowDown' },
  { modifiers: { ctrl: false, alt: true, shift: true, meta: false }, baseKey: 'ArrowUp' },
  { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyA' },
  { modifiers: { ctrl: false, alt: true, shift: false, meta: true }, baseKey: 'KeyV' },
];

export const COMBINATION_PROMPTS_LEVEL_4: KeyCombination[] = [
  // 4-key combinations (Level 4)
  { modifiers: { ctrl: true, alt: true, shift: true, meta: false }, baseKey: 'KeyF' },
  { modifiers: { ctrl: true, alt: true, shift: true, meta: false }, baseKey: 'KeyP' },
  { modifiers: { ctrl: true, alt: true, shift: true, meta: false }, baseKey: 'KeyS' },
  { modifiers: { ctrl: true, alt: true, shift: true, meta: false }, baseKey: 'KeyR' },
  { modifiers: { ctrl: true, alt: true, shift: true, meta: false }, baseKey: 'KeyN' },
  { modifiers: { ctrl: true, alt: true, shift: true, meta: false }, baseKey: 'KeyD' },
  { modifiers: { ctrl: true, alt: true, shift: true, meta: false }, baseKey: 'KeyM' },
  { modifiers: { ctrl: true, alt: true, shift: true, meta: false }, baseKey: 'KeyK' },
  { modifiers: { ctrl: true, alt: false, shift: true, meta: true }, baseKey: 'KeyA' },
  { modifiers: { ctrl: true, alt: false, shift: true, meta: true }, baseKey: 'KeyB' },
  { modifiers: { ctrl: false, alt: true, shift: true, meta: true }, baseKey: 'KeyE' },
  { modifiers: { ctrl: false, alt: true, shift: true, meta: true }, baseKey: 'KeyV' },
  { modifiers: { ctrl: true, alt: true, shift: false, meta: true }, baseKey: 'KeyL' },
  { modifiers: { ctrl: true, alt: true, shift: false, meta: true }, baseKey: 'KeyR' },
  { modifiers: { ctrl: true, alt: true, shift: true, meta: false }, baseKey: 'ArrowUp' },
  { modifiers: { ctrl: true, alt: true, shift: true, meta: false }, baseKey: 'ArrowDown' },
];

/**
 * All combination prompts merged across all difficulty levels.
 */
export const ALL_COMBINATION_PROMPTS: KeyCombination[] = [
  ...COMBINATION_PROMPTS_LEVEL_1,
  ...COMBINATION_PROMPTS_LEVEL_2,
  ...COMBINATION_PROMPTS_LEVEL_3,
  ...COMBINATION_PROMPTS_LEVEL_4,
];

/**
 * Map of category to its available prompts.
 */
export const KEY_PROMPTS_BY_CATEGORY: Record<KeyCategory, KeyCombination[]> = {
  'modifiers': MODIFIER_PROMPTS,
  'numbers': NUMBER_PROMPTS,
  'function-keys': FUNCTION_KEY_PROMPTS,
  'navigation': NAVIGATION_PROMPTS,
  'combinations': ALL_COMBINATION_PROMPTS,
};

/**
 * Returns prompts for a given category.
 */
export function getPromptsForCategory(category: KeyCategory): KeyCombination[] {
  return KEY_PROMPTS_BY_CATEGORY[category];
}

/**
 * Returns all available prompts across all categories.
 */
export function getAllPrompts(): KeyCombination[] {
  return Object.values(KEY_PROMPTS_BY_CATEGORY).flat();
}

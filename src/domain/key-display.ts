import type { KeyCombination } from './types';

/**
 * macOS modifier symbols in canonical order.
 */
const MODIFIER_SYMBOLS = {
  ctrl: '⌃',
  alt: '⌥',
  shift: '⇧',
  meta: '⌘',
} as const;

/**
 * Mapping from event.code values to human-readable key names.
 */
const KEY_NAME_MAP: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Space',
  Tab: 'Tab',
  Enter: 'Return',
  Backspace: 'Delete',
  Delete: '⌦',
  Home: 'Home',
  End: 'End',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  Escape: 'Esc',
};

/**
 * Regex to detect function key codes (F1–F12).
 */
const FUNCTION_KEY_REGEX = /^F([1-9]|1[0-2])$/;

/**
 * Converts an event.code value to a human-readable key name.
 *
 * - "KeyC" → "C"
 * - "Digit1" → "1"
 * - "F5" → "F5"
 * - Arrow/special keys use the KEY_NAME_MAP
 */
export function getKeyName(code: string): string {
  // Check explicit map first
  if (code in KEY_NAME_MAP) {
    return KEY_NAME_MAP[code];
  }

  // Function keys: F1–F12
  if (FUNCTION_KEY_REGEX.test(code)) {
    return code;
  }

  // Letter keys: "KeyC" → "C"
  if (code.startsWith('Key') && code.length === 4) {
    return code[3];
  }

  // Digit keys: "Digit1" → "1"
  if (code.startsWith('Digit') && code.length === 6) {
    return code[5];
  }

  // Fallback: return the code as-is
  return code;
}

/**
 * Determines whether a base key code is a function key (F1–F12).
 */
export function isFunctionKey(code: string): boolean {
  return FUNCTION_KEY_REGEX.test(code);
}

/**
 * Formats a KeyCombination into a macOS-style display string.
 *
 * Rules:
 * - Modifiers are rendered as macOS symbols in canonical order: ⌃ → ⌥ → ⇧ → ⌘
 * - The base key is appended after modifiers
 * - If the base key is F1–F12, "Fn " is prepended before the base key name
 *
 * Examples:
 * - Cmd+C → "⌘C"
 * - Ctrl+Shift+P → "⌃⇧P"
 * - Cmd+Shift+F5 → "⌘⇧Fn F5"
 * - Alt+ArrowUp → "⌥↑"
 */
export function formatKeyCombination(combination: KeyCombination): string {
  const { modifiers, baseKey } = combination;

  // Build modifier string in canonical order: ⌃ → ⌥ → ⇧ → ⌘
  let result = '';

  if (modifiers.ctrl) {
    result += MODIFIER_SYMBOLS.ctrl;
  }
  if (modifiers.alt) {
    result += MODIFIER_SYMBOLS.alt;
  }
  if (modifiers.shift) {
    result += MODIFIER_SYMBOLS.shift;
  }
  if (modifiers.meta) {
    result += MODIFIER_SYMBOLS.meta;
  }

  // Append base key with Fn prefix for function keys
  const keyName = getKeyName(baseKey);

  if (isFunctionKey(baseKey)) {
    result += `Fn ${keyName}`;
  } else {
    result += keyName;
  }

  return result;
}

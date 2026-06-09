import type { KeyCombination } from '../domain/types';

/**
 * macOS-reserved key combinations that cannot be captured by the browser.
 * These are intercepted at the OS level before reaching the web application.
 *
 * Requirements: 8.2
 */
export const OS_RESERVED_COMBINATIONS: KeyCombination[] = [
  // Cmd+Tab — Application switcher
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'Tab' },
  // Cmd+Q — Quit application
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyQ' },
  // Cmd+Space — Spotlight search
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'Space' },
  // Cmd+H — Hide application
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyH' },
  // Cmd+M — Minimize window
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyM' },
  // Ctrl+Up — Mission Control
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'ArrowUp' },
  // Ctrl+Down — Application windows
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'ArrowDown' },
  // Ctrl+Left — Move left a space
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'ArrowLeft' },
  // Ctrl+Right — Move right a space
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'ArrowRight' },
];

/**
 * Checks whether a given key combination is OS-reserved and cannot be captured.
 */
export function isOsReserved(combination: KeyCombination): boolean {
  return OS_RESERVED_COMBINATIONS.some(
    (reserved) =>
      reserved.baseKey === combination.baseKey &&
      reserved.modifiers.ctrl === combination.modifiers.ctrl &&
      reserved.modifiers.alt === combination.modifiers.alt &&
      reserved.modifiers.shift === combination.modifiers.shift &&
      reserved.modifiers.meta === combination.modifiers.meta
  );
}

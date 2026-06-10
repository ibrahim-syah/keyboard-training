import type { KeyCombination } from '../domain/types';

/**
 * OS-level reserved combinations (macOS).
 * These are intercepted at the OS level before reaching the web application.
 *
 * Requirements: 1.1
 */
export const OS_RESERVED: KeyCombination[] = [
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
 * Browser-reserved combinations that cannot be reliably intercepted.
 * These are handled by the browser before reaching the web application.
 *
 * Requirements: 1.2
 */
export const BROWSER_RESERVED: KeyCombination[] = [
  // Cmd+W — Close tab
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyW' },
  // Cmd+T — New tab
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyT' },
  // Cmd+N — New window
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyN' },
  // Cmd+L — Focus address bar
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyL' },
  // Cmd+R — Reload page
  { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyR' },
  // Cmd+Shift+T — Reopen closed tab
  { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyT' },
  // Cmd+Shift+N — New incognito window
  { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyN' },
  // Cmd+Shift+W — Close all tabs
  { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyW' },
];

/**
 * Combined default reserved list (OS + Browser).
 * This is the baseline reserved set before any user overrides are applied.
 *
 * Requirements: 1.1, 1.2
 */
export const DEFAULT_RESERVED_COMBINATIONS: KeyCombination[] = [
  ...OS_RESERVED,
  ...BROWSER_RESERVED,
];

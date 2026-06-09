import { type CSSProperties } from 'react';

/**
 * Props for the VisualKeyboard component.
 *
 * - highlightedKeys: event.code values of the keys to highlight (target prompt)
 * - heldKeys: event.code values of keys currently held down (real-time state)
 * - inactive: whether to apply pulse animation to highlighted keys (10s inactivity)
 */
export interface VisualKeyboardProps {
  highlightedKeys: string[];
  heldKeys: string[];
  inactive: boolean;
}

/** A single key definition in the keyboard layout */
interface KeyDef {
  code: string;
  label: string;
  width?: number; // relative width multiplier (1 = standard key)
}

// --- Keyboard Layout Definitions ---

const ROW_ESCAPE: KeyDef[] = [
  { code: 'Escape', label: 'Esc', width: 1 },
  { code: 'F1', label: 'F1' },
  { code: 'F2', label: 'F2' },
  { code: 'F3', label: 'F3' },
  { code: 'F4', label: 'F4' },
  { code: 'F5', label: 'F5' },
  { code: 'F6', label: 'F6' },
  { code: 'F7', label: 'F7' },
  { code: 'F8', label: 'F8' },
  { code: 'F9', label: 'F9' },
  { code: 'F10', label: 'F10' },
  { code: 'F11', label: 'F11' },
  { code: 'F12', label: 'F12' },
];

const ROW_NUMBERS: KeyDef[] = [
  { code: 'Backquote', label: '`' },
  { code: 'Digit1', label: '1' },
  { code: 'Digit2', label: '2' },
  { code: 'Digit3', label: '3' },
  { code: 'Digit4', label: '4' },
  { code: 'Digit5', label: '5' },
  { code: 'Digit6', label: '6' },
  { code: 'Digit7', label: '7' },
  { code: 'Digit8', label: '8' },
  { code: 'Digit9', label: '9' },
  { code: 'Digit0', label: '0' },
  { code: 'Minus', label: '-' },
  { code: 'Equal', label: '=' },
  { code: 'Backspace', label: '⌫', width: 1.5 },
];

const ROW_QWERTY: KeyDef[] = [
  { code: 'Tab', label: 'Tab', width: 1.5 },
  { code: 'KeyQ', label: 'Q' },
  { code: 'KeyW', label: 'W' },
  { code: 'KeyE', label: 'E' },
  { code: 'KeyR', label: 'R' },
  { code: 'KeyT', label: 'T' },
  { code: 'KeyY', label: 'Y' },
  { code: 'KeyU', label: 'U' },
  { code: 'KeyI', label: 'I' },
  { code: 'KeyO', label: 'O' },
  { code: 'KeyP', label: 'P' },
  { code: 'BracketLeft', label: '[' },
  { code: 'BracketRight', label: ']' },
  { code: 'Backslash', label: '\\', width: 1 },
];

const ROW_ASDF: KeyDef[] = [
  { code: 'CapsLock', label: 'Caps', width: 1.75 },
  { code: 'KeyA', label: 'A' },
  { code: 'KeyS', label: 'S' },
  { code: 'KeyD', label: 'D' },
  { code: 'KeyF', label: 'F' },
  { code: 'KeyG', label: 'G' },
  { code: 'KeyH', label: 'H' },
  { code: 'KeyJ', label: 'J' },
  { code: 'KeyK', label: 'K' },
  { code: 'KeyL', label: 'L' },
  { code: 'Semicolon', label: ';' },
  { code: 'Quote', label: "'" },
  { code: 'Enter', label: 'Return', width: 1.75 },
];

const ROW_ZXCV: KeyDef[] = [
  { code: 'ShiftLeft', label: '⇧', width: 2.25 },
  { code: 'KeyZ', label: 'Z' },
  { code: 'KeyX', label: 'X' },
  { code: 'KeyC', label: 'C' },
  { code: 'KeyV', label: 'V' },
  { code: 'KeyB', label: 'B' },
  { code: 'KeyN', label: 'N' },
  { code: 'KeyM', label: 'M' },
  { code: 'Comma', label: ',' },
  { code: 'Period', label: '.' },
  { code: 'Slash', label: '/' },
  { code: 'ShiftRight', label: '⇧', width: 2.25 },
];

const ROW_BOTTOM: KeyDef[] = [
  { code: 'Fn', label: 'Fn', width: 1 },
  { code: 'ControlLeft', label: '⌃', width: 1 },
  { code: 'AltLeft', label: '⌥', width: 1 },
  { code: 'MetaLeft', label: '⌘', width: 1.25 },
  { code: 'Space', label: '', width: 5 },
  { code: 'MetaRight', label: '⌘', width: 1.25 },
  { code: 'AltRight', label: '⌥', width: 1 },
  { code: 'ArrowLeft', label: '←' },
  { code: 'ArrowUp', label: '↑' },
  { code: 'ArrowDown', label: '↓' },
  { code: 'ArrowRight', label: '→' },
];

const KEYBOARD_ROWS: KeyDef[][] = [
  ROW_ESCAPE,
  ROW_NUMBERS,
  ROW_QWERTY,
  ROW_ASDF,
  ROW_ZXCV,
  ROW_BOTTOM,
];

// --- Styles ---

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '16px',
    background: 'var(--code-bg, #1f2028)',
    borderRadius: '12px',
    border: '1px solid var(--border, #2e303a)',
    width: '100%',
    maxWidth: '720px',
    margin: '0 auto',
    boxSizing: 'border-box',
  } satisfies CSSProperties,

  row: {
    display: 'flex',
    gap: '3px',
    justifyContent: 'center',
  } satisfies CSSProperties,

  key: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '36px',
    borderRadius: '5px',
    border: '1px solid var(--border, #2e303a)',
    background: 'var(--bg, #16171d)',
    color: 'var(--text, #9ca3af)',
    fontSize: '11px',
    fontFamily: 'var(--sans, system-ui)',
    userSelect: 'none',
    transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  } satisfies CSSProperties,

  keyHighlighted: {
    background: 'rgba(59, 130, 246, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.7)',
    color: '#93c5fd',
    boxShadow: '0 0 6px rgba(59, 130, 246, 0.4)',
  } satisfies CSSProperties,

  keyHeld: {
    background: 'rgba(34, 197, 94, 0.25)',
    borderColor: 'rgba(34, 197, 94, 0.7)',
    color: '#86efac',
    boxShadow: '0 0 6px rgba(34, 197, 94, 0.4)',
  } satisfies CSSProperties,
} as const;

// Pulse keyframes injected via a <style> tag
const PULSE_CSS = `
@keyframes kb-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.kb-pulse {
  animation: kb-pulse 1.5s ease-in-out infinite;
}
`;

/**
 * Determines the visual style for a key based on highlight/held/inactive state.
 */
function getKeyStyle(
  code: string,
  highlightedSet: Set<string>,
  heldSet: Set<string>,
): CSSProperties {
  const isHighlighted = highlightedSet.has(code);
  const isHeld = heldSet.has(code);

  // Held takes priority over highlighted
  if (isHeld) {
    return { ...styles.key, ...styles.keyHeld };
  }
  if (isHighlighted) {
    return { ...styles.key, ...styles.keyHighlighted };
  }
  return styles.key;
}

/**
 * VisualKeyboard renders a simplified macOS keyboard layout and highlights
 * the target keys for the current prompt, as well as keys currently held down.
 *
 * Validates: Requirements 3.5, 3.6
 */
export function VisualKeyboard({ highlightedKeys, heldKeys, inactive }: VisualKeyboardProps) {
  const highlightedSet = new Set(highlightedKeys);
  const heldSet = new Set(heldKeys);

  return (
    <div style={styles.container} role="img" aria-label="Visual keyboard layout">
      {/* Inject pulse animation CSS */}
      <style>{PULSE_CSS}</style>

      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} style={styles.row}>
          {row.map((keyDef) => {
            const isHighlighted = highlightedSet.has(keyDef.code);
            const width = (keyDef.width ?? 1) * 44;
            const keyStyle: CSSProperties = {
              ...getKeyStyle(keyDef.code, highlightedSet, heldSet),
              width: `${width}px`,
              minWidth: `${width}px`,
            };

            return (
              <div
                key={keyDef.code}
                style={keyStyle}
                className={inactive && isHighlighted ? 'kb-pulse' : undefined}
                data-keycode={keyDef.code}
                aria-label={keyDef.label || 'Space'}
              >
                {keyDef.label}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default VisualKeyboard;

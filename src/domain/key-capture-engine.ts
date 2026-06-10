import type { KeyState } from './types';

/**
 * Set of event.code values that represent modifier keys.
 */
const MODIFIER_CODES = new Set([
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'ShiftLeft',
  'ShiftRight',
  'MetaLeft',
  'MetaRight',
]);

/**
 * Maps an event.code for a modifier key to the corresponding KeyState modifier field.
 */
const CODE_TO_MODIFIER: Record<string, keyof KeyState['modifiers']> = {
  ControlLeft: 'ctrlLeft',
  ControlRight: 'ctrlRight',
  AltLeft: 'altLeft',
  AltRight: 'altRight',
  ShiftLeft: 'shiftLeft',
  ShiftRight: 'shiftRight',
  MetaLeft: 'metaLeft',
  MetaRight: 'metaRight',
};

/**
 * Callback subscription for key combination events.
 */
type KeyCombinationCallback = (state: KeyState) => void;

/**
 * Interface for the Key Capture Engine.
 */
export interface KeyCaptureEngine {
  /** Start capturing key events, calling preventDefault during exercises */
  enable(exerciseActive: boolean): void;
  /** Stop capturing key events */
  disable(): void;
  /** Subscribe to complete key combination events */
  onKeyCombination(callback: KeyCombinationCallback): () => void;
  /** Get current held keys (for visual keyboard) */
  getCurrentState(): KeyState;
}

/**
 * Creates the initial empty KeyState with no modifiers held and no base key.
 */
function createEmptyState(): KeyState {
  return {
    modifiers: {
      ctrlLeft: false,
      ctrlRight: false,
      altLeft: false,
      altRight: false,
      shiftLeft: false,
      shiftRight: false,
      metaLeft: false,
      metaRight: false,
    },
    baseKey: null,
  };
}

/**
 * Creates a new KeyCaptureEngine instance.
 *
 * The engine attaches keydown/keyup listeners to the window and tracks
 * the state of all modifier keys. When a non-modifier key is pressed
 * while modifiers are held, the onKeyCombination callbacks are fired.
 */
export function createKeyCaptureEngine(): KeyCaptureEngine {
  let state: KeyState = createEmptyState();
  let exerciseActive = false;
  let enabled = false;
  const callbacks: Set<KeyCombinationCallback> = new Set();

  function handleKeyDown(event: KeyboardEvent): void {
    // Ignore repeated keys (held down)
    if (event.repeat) {
      if (exerciseActive) {
        event.preventDefault();
      }
      return;
    }

    // Prevent default browser shortcuts when exercise is active
    if (exerciseActive) {
      event.preventDefault();
    }

    const code = event.code;

    if (MODIFIER_CODES.has(code)) {
      // Update modifier state using event.code for left/right distinction
      const modifierKey = CODE_TO_MODIFIER[code];
      if (modifierKey) {
        state = {
          ...state,
          modifiers: { ...state.modifiers, [modifierKey]: true },
        };
      }

      // Fire callbacks for modifier-only presses (supports single-modifier prompts)
      const snapshot: KeyState = {
        modifiers: { ...state.modifiers },
        baseKey: code, // The modifier itself is the "key pressed"
      };
      for (const callback of callbacks) {
        callback(snapshot);
      }
    } else {
      // Non-modifier key pressed — update base key and fire callbacks
      state = { ...state, baseKey: code };

      // Fire all registered callbacks with current state snapshot
      const snapshot: KeyState = {
        modifiers: { ...state.modifiers },
        baseKey: state.baseKey,
      };
      for (const callback of callbacks) {
        callback(snapshot);
      }
    }
  }

  function handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;

    if (MODIFIER_CODES.has(code)) {
      // Release modifier
      const modifierKey = CODE_TO_MODIFIER[code];
      if (modifierKey) {
        state = {
          ...state,
          modifiers: { ...state.modifiers, [modifierKey]: false },
        };
      }
    } else {
      // Clear base key when released
      if (state.baseKey === code) {
        state = { ...state, baseKey: null };
      }
    }
  }

  return {
    enable(isExerciseActive: boolean): void {
      if (enabled) {
        // Already enabled, update exerciseActive flag
        exerciseActive = isExerciseActive;
        return;
      }
      exerciseActive = isExerciseActive;
      enabled = true;
      state = createEmptyState();
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    },

    disable(): void {
      if (!enabled) return;
      enabled = false;
      exerciseActive = false;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      state = createEmptyState();
      callbacks.clear();
    },

    onKeyCombination(callback: KeyCombinationCallback): () => void {
      callbacks.add(callback);
      return () => {
        callbacks.delete(callback);
      };
    },

    getCurrentState(): KeyState {
      return {
        modifiers: { ...state.modifiers },
        baseKey: state.baseKey,
      };
    },
  };
}

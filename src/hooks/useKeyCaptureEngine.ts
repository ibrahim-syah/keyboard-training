import { useEffect, useRef, useState, useCallback } from 'react';
import type { KeyState } from '../domain/types';
import { createKeyCaptureEngine } from '../domain/key-capture-engine';
import type { KeyCaptureEngine } from '../domain/key-capture-engine';

/**
 * React hook wrapping the KeyCaptureEngine lifecycle.
 *
 * Enables the engine when exerciseActive is true (exercise/drill pages),
 * disables it on unmount or when navigating away from active pages.
 *
 * Validates: Requirement 1.2
 */
export function useKeyCaptureEngine(exerciseActive: boolean) {
  const engineRef = useRef<KeyCaptureEngine | null>(null);
  const [currentState, setCurrentState] = useState<KeyState>({
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
  });

  // Create engine once on mount
  if (engineRef.current === null) {
    engineRef.current = createKeyCaptureEngine();
  }

  useEffect(() => {
    const engine = engineRef.current!;

    if (exerciseActive) {
      engine.enable(true);
    } else {
      engine.disable();
    }

    return () => {
      engine.disable();
    };
  }, [exerciseActive]);

  // Subscribe to combination events and update state
  useEffect(() => {
    const engine = engineRef.current!;

    const unsubscribe = engine.onKeyCombination((state) => {
      setCurrentState(state);
    });

    return unsubscribe;
  }, []);

  const onCombination = useCallback(
    (callback: (state: KeyState) => void): (() => void) => {
      const engine = engineRef.current!;
      return engine.onKeyCombination(callback);
    },
    [],
  );

  return {
    currentState,
    onCombination,
    engine: engineRef.current,
  };
}

import { useRef, useState, useCallback, useEffect } from 'react';
import type { ExerciseConfig, ExerciseState, KeyState } from '../domain/types';
import { ExerciseController } from '../domain/exercise-controller';

/**
 * React hook wrapping ExerciseController state and actions.
 *
 * Provides reactive access to exercise state and action functions
 * for starting exercises and handling user input.
 */
export function useExercise() {
  const controllerRef = useRef<ExerciseController | null>(null);

  if (controllerRef.current === null) {
    controllerRef.current = new ExerciseController();
  }

  const [state, setState] = useState<ExerciseState>(
    controllerRef.current.getState(),
  );

  // Subscribe to state changes
  useEffect(() => {
    const controller = controllerRef.current!;
    const unsubscribe = controller.onStateChange((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const start = useCallback((config: ExerciseConfig) => {
    controllerRef.current!.start(config);
  }, []);

  const handleInput = useCallback((keyState: KeyState) => {
    controllerRef.current!.handleInput(keyState);
  }, []);

  const isActive = state.status === 'active';

  return {
    start,
    handleInput,
    state,
    isActive,
  };
}

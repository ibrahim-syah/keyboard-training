import type {
  ExerciseConfig,
  ExerciseState,
  KeyCombination,
  KeyState,
  PromptResult,
} from './types';
import { match } from './key-matcher';

/**
 * Controls the lifecycle of an exercise session.
 *
 * Manages prompt sequencing, input matching, timing, and state notifications.
 * Implements Requirements 2.5, 3.3, 3.4.
 */
export class ExerciseController {
  private state: ExerciseState;
  private listeners: Set<(state: ExerciseState) => void> = new Set();
  private promptStartTime: number = 0;
  private currentAttempts: number = 0;

  constructor() {
    this.state = createIdleState();
  }

  /**
   * Starts a new exercise with the given configuration.
   * Clamps promptCount to [10, 50] and takes that many prompts from config.prompts.
   */
  start(config: ExerciseConfig): void {
    const clampedCount = Math.max(10, Math.min(50, config.promptCount));
    const prompts = config.prompts.slice(0, clampedCount);

    // If fewer prompts available than requested, cycle through them
    const finalPrompts = padPrompts(prompts, clampedCount);

    this.state = {
      currentPromptIndex: 0,
      totalPrompts: finalPrompts.length,
      currentPrompt: finalPrompts[0],
      results: [],
      startTime: Date.now(),
      status: 'active',
    };

    this.promptStartTime = Date.now();
    this.currentAttempts = 0;

    // Store prompts internally for advancing
    this._prompts = finalPrompts;

    this.notifyListeners();
  }

  /**
   * Handles user key input during an active exercise.
   * Uses KeyMatcher to check correctness.
   * On correct: records result with responseTime, advances to next prompt.
   * On incorrect: records attempt, keeps current prompt unchanged.
   */
  handleInput(keyState: KeyState): void {
    if (this.state.status !== 'active') {
      return;
    }

    const result = match(this.state.currentPrompt, keyState);

    if (result.correct) {
      const responseTimeMs = Date.now() - this.promptStartTime;

      const promptResult: PromptResult = {
        prompt: this.state.currentPrompt,
        attempts: this.currentAttempts + 1,
        responseTimeMs,
        correct: true,
      };

      const newResults = [...this.state.results, promptResult];
      const nextIndex = this.state.currentPromptIndex + 1;

      if (nextIndex >= this.state.totalPrompts) {
        // Exercise complete
        this.state = {
          ...this.state,
          currentPromptIndex: nextIndex,
          results: newResults,
          status: 'complete',
        };
      } else {
        // Advance to next prompt
        this.state = {
          ...this.state,
          currentPromptIndex: nextIndex,
          currentPrompt: this._prompts[nextIndex],
          results: newResults,
        };
        this.promptStartTime = Date.now();
        this.currentAttempts = 0;
      }

      this.notifyListeners();
    } else {
      // Incorrect input: increment attempts, keep same prompt
      this.currentAttempts++;
      this.notifyListeners();
    }
  }

  /**
   * Returns the current exercise state.
   */
  getState(): ExerciseState {
    return this.state;
  }

  /**
   * Subscribes to state changes. Returns an unsubscribe function.
   */
  onStateChange(callback: (state: ExerciseState) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private _prompts: KeyCombination[] = [];

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

/**
 * Creates the default idle state.
 */
function createIdleState(): ExerciseState {
  return {
    currentPromptIndex: 0,
    totalPrompts: 0,
    currentPrompt: { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: '' },
    results: [],
    startTime: 0,
    status: 'idle',
  };
}

/**
 * Pads a prompt list to the desired count by cycling through available prompts.
 * If prompts array is empty, returns empty (should not happen in practice).
 */
function padPrompts(prompts: KeyCombination[], count: number): KeyCombination[] {
  if (prompts.length === 0) {
    return [];
  }
  if (prompts.length >= count) {
    return prompts.slice(0, count);
  }
  const result: KeyCombination[] = [];
  for (let i = 0; i < count; i++) {
    result.push(prompts[i % prompts.length]);
  }
  return result;
}

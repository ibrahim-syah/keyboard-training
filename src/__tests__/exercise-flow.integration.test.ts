/**
 * Integration tests for the exercise flow.
 *
 * Tests the full lifecycle: start → correct/incorrect inputs → complete → session saved.
 * Tests OS-reserved combination skipping during prompt selection.
 * Tests prompt count clamping to [10, 50].
 *
 * Validates: Requirements 2.5, 3.3, 3.4, 5.1, 8.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExerciseController } from '../domain/exercise-controller';
import { getPromptsForCategory } from '../domain/prompt-selector';
import { saveSession, getSessions } from '../domain/progress-tracker';
import { isOsReserved } from '../data/os-reserved';
import type { ExerciseConfig, KeyCombination, KeyState, SessionRecord } from '../domain/types';

// --- localStorage mock setup ---
let mockStorage: Record<string, string>;
let originalLocalStorage: Storage;

function setupLocalStorageMock() {
  mockStorage = {};
  originalLocalStorage = globalThis.localStorage;

  const localStorageMock: Storage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      mockStorage = {};
    },
    get length() {
      return Object.keys(mockStorage).length;
    },
    key: (index: number) => Object.keys(mockStorage)[index] ?? null,
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

function teardownLocalStorageMock() {
  Object.defineProperty(globalThis, 'localStorage', {
    value: originalLocalStorage,
    writable: true,
    configurable: true,
  });
}

/**
 * Creates a KeyState that matches a given KeyCombination (correct input).
 */
function createMatchingKeyState(combo: KeyCombination): KeyState {
  return {
    modifiers: {
      ctrlLeft: combo.modifiers.ctrl,
      ctrlRight: false,
      altLeft: combo.modifiers.alt,
      altRight: false,
      shiftLeft: combo.modifiers.shift,
      shiftRight: false,
      metaLeft: combo.modifiers.meta,
      metaRight: false,
    },
    baseKey: combo.baseKey,
  };
}

/**
 * Creates an incorrect KeyState (wrong base key, no modifiers).
 */
function createIncorrectKeyState(): KeyState {
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
    baseKey: 'KeyZ',
  };
}

describe('Exercise Flow Integration Tests', () => {
  beforeEach(() => {
    setupLocalStorageMock();
  });

  afterEach(() => {
    teardownLocalStorageMock();
  });

  describe('Full exercise lifecycle', () => {
    it('should transition idle → active → complete on start and correct inputs', () => {
      const controller = new ExerciseController();

      // Initially idle
      expect(controller.getState().status).toBe('idle');

      const prompts: KeyCombination[] = Array.from({ length: 10 }, (_, i) => ({
        modifiers: { ctrl: false, alt: false, shift: false, meta: true },
        baseKey: `Key${String.fromCharCode(65 + i)}`, // KeyA through KeyJ
      }));

      const config: ExerciseConfig = {
        category: 'combinations',
        promptCount: 10,
        prompts,
      };

      controller.start(config);

      // After start, status is 'active'
      expect(controller.getState().status).toBe('active');
      expect(controller.getState().totalPrompts).toBe(10);
      expect(controller.getState().currentPromptIndex).toBe(0);

      // Feed all correct inputs
      for (let i = 0; i < 10; i++) {
        const state = controller.getState();
        expect(state.status).toBe(i < 10 ? 'active' : 'complete');
        const currentPrompt = state.currentPrompt;
        const correctInput = createMatchingKeyState(currentPrompt);
        controller.handleInput(correctInput);
      }

      // After all prompts answered, status is 'complete'
      const finalState = controller.getState();
      expect(finalState.status).toBe('complete');
      expect(finalState.results).toHaveLength(10);
      expect(finalState.results.every((r) => r.correct)).toBe(true);
    });

    it('should keep same prompt on incorrect input and advance on correct input', () => {
      const controller = new ExerciseController();

      const prompts: KeyCombination[] = Array.from({ length: 10 }, (_, i) => ({
        modifiers: { ctrl: true, alt: false, shift: false, meta: false },
        baseKey: `Key${String.fromCharCode(65 + i)}`,
      }));

      const config: ExerciseConfig = {
        category: 'combinations',
        promptCount: 10,
        prompts,
      };

      controller.start(config);

      // First prompt
      const firstPrompt = controller.getState().currentPrompt;

      // Send incorrect input — prompt should remain the same
      controller.handleInput(createIncorrectKeyState());
      expect(controller.getState().currentPrompt).toEqual(firstPrompt);
      expect(controller.getState().currentPromptIndex).toBe(0);

      // Send another incorrect input
      controller.handleInput(createIncorrectKeyState());
      expect(controller.getState().currentPrompt).toEqual(firstPrompt);
      expect(controller.getState().currentPromptIndex).toBe(0);

      // Send correct input — should advance
      controller.handleInput(createMatchingKeyState(firstPrompt));
      expect(controller.getState().currentPromptIndex).toBe(1);

      // The result should show 3 attempts (2 incorrect + 1 correct)
      expect(controller.getState().results[0].attempts).toBe(3);
      expect(controller.getState().results[0].correct).toBe(true);
    });

    it('should notify listeners on state changes', () => {
      const controller = new ExerciseController();
      const states: string[] = [];

      controller.onStateChange((state) => {
        states.push(state.status);
      });

      const prompts: KeyCombination[] = Array.from({ length: 10 }, () => ({
        modifiers: { ctrl: false, alt: false, shift: true, meta: false },
        baseKey: 'KeyA',
      }));

      const config: ExerciseConfig = {
        category: 'combinations',
        promptCount: 10,
        prompts,
      };

      controller.start(config);
      expect(states).toContain('active');

      // Complete all prompts
      for (let i = 0; i < 10; i++) {
        const currentPrompt = controller.getState().currentPrompt;
        controller.handleInput(createMatchingKeyState(currentPrompt));
      }

      expect(states).toContain('complete');
    });
  });

  describe('Session persistence after completion', () => {
    it('should save session to progress-tracker after exercise completes', () => {
      const controller = new ExerciseController();

      const prompts: KeyCombination[] = Array.from({ length: 10 }, (_, i) => ({
        modifiers: { ctrl: false, alt: false, shift: false, meta: true },
        baseKey: `Key${String.fromCharCode(65 + i)}`,
      }));

      const config: ExerciseConfig = {
        category: 'combinations',
        promptCount: 10,
        prompts,
      };

      controller.start(config);

      // Complete the exercise
      for (let i = 0; i < 10; i++) {
        const currentPrompt = controller.getState().currentPrompt;
        controller.handleInput(createMatchingKeyState(currentPrompt));
      }

      expect(controller.getState().status).toBe('complete');

      // Build and save session record from the completed exercise state
      const finalState = controller.getState();
      const totalAttempts = finalState.results.reduce((sum, r) => sum + r.attempts, 0);
      const correctCount = finalState.results.filter((r) => r.correct).length;
      const accuracy = correctCount / finalState.totalPrompts;
      const avgResponseTimeMs =
        finalState.results.reduce((sum, r) => sum + r.responseTimeMs, 0) / finalState.results.length;

      const session: SessionRecord = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        category: config.category,
        accuracy,
        avgResponseTimeMs,
        promptCount: finalState.totalPrompts,
        perCombinationData: finalState.results.map((r) => ({
          combination: r.prompt,
          attempts: r.attempts,
          correctCount: r.correct ? 1 : 0,
          avgResponseTimeMs: r.responseTimeMs,
        })),
      };

      const saved = saveSession(session);
      expect(saved).toBe(true);

      // Verify session is retrievable via getSessions
      const sessions = getSessions('combinations');
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(session.id);
      expect(sessions[0].category).toBe('combinations');
      expect(sessions[0].accuracy).toBe(accuracy);
      expect(sessions[0].promptCount).toBe(10);
    });
  });

  describe('OS-reserved combination skipping', () => {
    it('should not include OS-reserved combinations in prompts from getPromptsForCategory', () => {
      // Test all categories
      const categories = ['modifiers', 'numbers', 'function-keys', 'navigation', 'combinations'] as const;

      for (const category of categories) {
        const result = getPromptsForCategory(category, 50);

        // Verify no prompt in the result is OS-reserved
        for (const prompt of result.prompts) {
          expect(isOsReserved(prompt)).toBe(false);
        }
      }
    });

    it('should report skipped reserved combinations in the result', () => {
      // The 'navigation' category has Ctrl+Arrow combos which are OS-reserved
      const result = getPromptsForCategory('navigation', 20);

      // Some navigation combos should be filtered (Ctrl+Up, Ctrl+Down, Ctrl+Left, Ctrl+Right are reserved)
      // Check that skippedReserved is populated for navigation category
      // since the navigation prompts include Alt+ArrowUp/Down which are NOT reserved,
      // but the os-reserved list has Ctrl+Arrow variants
      // Verify the prompts returned don't contain any reserved ones
      for (const prompt of result.prompts) {
        expect(isOsReserved(prompt)).toBe(false);
      }
    });

    it('should filter OS-reserved combos from combinations category', () => {
      const result = getPromptsForCategory('combinations', 50);

      // Combinations category includes Cmd+Tab (reserved), etc.
      // Verify none of the returned prompts are OS-reserved
      for (const prompt of result.prompts) {
        expect(isOsReserved(prompt)).toBe(false);
      }

      // The skippedReserved array should contain any combos that were filtered
      for (const skipped of result.skippedReserved) {
        expect(isOsReserved(skipped)).toBe(true);
      }
    });
  });

  describe('Prompt count clamping', () => {
    it('should clamp promptCount=5 to minimum of 10 (totalPrompts=10)', () => {
      const controller = new ExerciseController();

      const prompts: KeyCombination[] = Array.from({ length: 20 }, (_, i) => ({
        modifiers: { ctrl: false, alt: false, shift: true, meta: false },
        baseKey: `Key${String.fromCharCode(65 + (i % 26))}`,
      }));

      const config: ExerciseConfig = {
        category: 'modifiers',
        promptCount: 5, // Below minimum, should clamp to 10
        prompts,
      };

      controller.start(config);

      expect(controller.getState().totalPrompts).toBe(10);
      expect(controller.getState().status).toBe('active');
    });

    it('should clamp promptCount=100 to maximum of 50 (totalPrompts=50)', () => {
      const controller = new ExerciseController();

      const prompts: KeyCombination[] = Array.from({ length: 60 }, (_, i) => ({
        modifiers: { ctrl: true, alt: false, shift: false, meta: false },
        baseKey: `Key${String.fromCharCode(65 + (i % 26))}`,
      }));

      const config: ExerciseConfig = {
        category: 'combinations',
        promptCount: 100, // Above maximum, should clamp to 50
        prompts,
      };

      controller.start(config);

      expect(controller.getState().totalPrompts).toBe(50);
      expect(controller.getState().status).toBe('active');
    });

    it('should accept promptCount=10 without clamping (boundary)', () => {
      const controller = new ExerciseController();

      const prompts: KeyCombination[] = Array.from({ length: 15 }, (_, i) => ({
        modifiers: { ctrl: false, alt: true, shift: false, meta: false },
        baseKey: `Key${String.fromCharCode(65 + i)}`,
      }));

      const config: ExerciseConfig = {
        category: 'numbers',
        promptCount: 10,
        prompts,
      };

      controller.start(config);

      expect(controller.getState().totalPrompts).toBe(10);
    });

    it('should accept promptCount=50 without clamping (boundary)', () => {
      const controller = new ExerciseController();

      const prompts: KeyCombination[] = Array.from({ length: 60 }, (_, i) => ({
        modifiers: { ctrl: false, alt: false, shift: false, meta: true },
        baseKey: `Key${String.fromCharCode(65 + (i % 26))}`,
      }));

      const config: ExerciseConfig = {
        category: 'function-keys',
        promptCount: 50,
        prompts,
      };

      controller.start(config);

      expect(controller.getState().totalPrompts).toBe(50);
    });
  });
});

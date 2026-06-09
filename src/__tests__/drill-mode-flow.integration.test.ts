import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DrillModeEngine } from '../domain/drill-mode-engine';
import type { DrillConfig, KeyCombination, KeyState } from '../domain/types';

/**
 * Integration tests for drill mode flow.
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 6.4
 */

/** Helper to create a KeyState matching a given KeyCombination */
function makeKeyState(combo: KeyCombination): KeyState {
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

/** Helper to create an incorrect KeyState that won't match any standard combo */
function makeIncorrectKeyState(): KeyState {
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

/** Helper to create an Escape KeyState */
function makeEscapeKeyState(): KeyState {
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
    baseKey: 'Escape',
  };
}

describe('Drill Mode Flow Integration', () => {
  let engine: DrillModeEngine;

  const customCombos: KeyCombination[] = [
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyC' },
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyV' },
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyX' },
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyZ' },
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyA' },
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyP' },
  ];

  beforeEach(() => {
    engine = new DrillModeEngine();
  });

  describe('Full drill lifecycle (Req 4.1, 4.5)', () => {
    it('should start drill, process correct and incorrect inputs, and produce valid stats on stop', () => {
      const config: DrillConfig = {
        category: 'combinations',
        customSet: customCombos,
      };

      engine.start(config);
      expect(engine.isActive()).toBe(true);
      expect(engine.getCurrentPrompt()).not.toBeNull();

      // Feed 8 correct inputs and 4 incorrect inputs
      let correctCount = 0;
      const totalInputs = 12;

      for (let i = 0; i < totalInputs; i++) {
        const currentPrompt = engine.getCurrentPrompt()!;
        if (i % 3 === 0) {
          // Every 3rd input is incorrect
          engine.handleInput(makeIncorrectKeyState());
        } else {
          engine.handleInput(makeKeyState(currentPrompt));
          correctCount++;
        }
      }

      // Stop and verify stats
      const stats = engine.stop();

      expect(engine.isActive()).toBe(false);
      expect(stats.totalAttempts).toBe(totalInputs);
      expect(stats.accuracy).toBeCloseTo(correctCount / totalInputs, 5);
      expect(stats.avgResponseTimeMs).toBeGreaterThanOrEqual(0);
      // mostMissed should contain at most 3 combinations and only those with errors
      expect(stats.mostMissed.length).toBeLessThanOrEqual(3);
      expect(stats.mostMissed.length).toBeGreaterThan(0);
      // Each mostMissed should be a valid KeyCombination from the pool
      for (const missed of stats.mostMissed) {
        expect(missed).toHaveProperty('modifiers');
        expect(missed).toHaveProperty('baseKey');
      }
    });

    it('should report 100% accuracy when all inputs are correct', () => {
      const config: DrillConfig = {
        category: 'combinations',
        customSet: customCombos,
      };

      engine.start(config);

      for (let i = 0; i < 5; i++) {
        const currentPrompt = engine.getCurrentPrompt()!;
        engine.handleInput(makeKeyState(currentPrompt));
      }

      const stats = engine.stop();
      expect(stats.accuracy).toBe(1);
      expect(stats.totalAttempts).toBe(5);
      expect(stats.mostMissed).toHaveLength(0);
    });

    it('should report 0% accuracy when all inputs are incorrect', () => {
      const config: DrillConfig = {
        category: 'combinations',
        customSet: customCombos,
      };

      engine.start(config);

      for (let i = 0; i < 5; i++) {
        engine.handleInput(makeIncorrectKeyState());
      }

      const stats = engine.stop();
      expect(stats.accuracy).toBe(0);
      expect(stats.totalAttempts).toBe(5);
      expect(stats.mostMissed.length).toBeGreaterThan(0);
    });
  });

  describe('Double-Escape exit (Req 4.6)', () => {
    it('should fire escape callback when two Escape keys are pressed within 500ms', () => {
      const config: DrillConfig = {
        category: 'combinations',
        customSet: customCombos,
      };

      engine.start(config);

      const escapeCb = vi.fn();
      engine.onEscapeSequence(escapeCb);

      // Simulate two Escape presses within 500ms
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      engine.handleInput(makeEscapeKeyState());

      // Advance 200ms (within 500ms threshold)
      vi.setSystemTime(now + 200);
      engine.handleInput(makeEscapeKeyState());

      expect(escapeCb).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should NOT fire escape callback when two Escape keys are pressed more than 500ms apart', () => {
      const config: DrillConfig = {
        category: 'combinations',
        customSet: customCombos,
      };

      engine.start(config);

      const escapeCb = vi.fn();
      engine.onEscapeSequence(escapeCb);

      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      engine.handleInput(makeEscapeKeyState());

      // Advance 600ms (beyond 500ms threshold)
      vi.setSystemTime(now + 600);
      engine.handleInput(makeEscapeKeyState());

      expect(escapeCb).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should allow unsubscribing from escape sequence callback', () => {
      const config: DrillConfig = {
        category: 'combinations',
        customSet: customCombos,
      };

      engine.start(config);

      const escapeCb = vi.fn();
      const unsubscribe = engine.onEscapeSequence(escapeCb);

      // Unsubscribe before triggering
      unsubscribe();

      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      engine.handleInput(makeEscapeKeyState());
      vi.setSystemTime(now + 200);
      engine.handleInput(makeEscapeKeyState());

      expect(escapeCb).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Adaptive weighting after 10 responses (Req 4.2, 4.3)', () => {
    it('should use uniform random before 10 responses and weighted after', () => {
      const config: DrillConfig = {
        category: 'combinations',
        customSet: customCombos,
      };

      engine.start(config);

      // Feed 12 responses (some incorrect) to trigger adaptive weighting
      for (let i = 0; i < 12; i++) {
        const currentPrompt = engine.getCurrentPrompt()!;
        if (i < 4) {
          // First 4 are incorrect - these combos will be weighted higher
          engine.handleInput(makeIncorrectKeyState());
        } else {
          // Rest are correct
          engine.handleInput(makeKeyState(currentPrompt));
        }
      }

      // After 12 responses (>10), getWeightedNextPrompt should use adaptive weighting
      // Verify it returns valid prompts from the pool
      const promptsFromWeighted = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const prompt = engine.getWeightedNextPrompt();
        expect(prompt).toHaveProperty('modifiers');
        expect(prompt).toHaveProperty('baseKey');
        promptsFromWeighted.add(prompt.baseKey);
      }

      // Should produce prompts (non-empty results)
      expect(promptsFromWeighted.size).toBeGreaterThan(0);
    });

    it('should return valid prompts from the pool in all cases', () => {
      const config: DrillConfig = {
        category: 'combinations',
        customSet: customCombos,
      };

      engine.start(config);

      // Before 10 responses (uniform random)
      for (let i = 0; i < 20; i++) {
        const prompt = engine.getWeightedNextPrompt();
        // Verify prompt is from the custom set
        const found = customCombos.some(
          c => c.baseKey === prompt.baseKey &&
            c.modifiers.ctrl === prompt.modifiers.ctrl &&
            c.modifiers.alt === prompt.modifiers.alt &&
            c.modifiers.shift === prompt.modifiers.shift &&
            c.modifiers.meta === prompt.modifiers.meta
        );
        expect(found).toBe(true);
      }
    });
  });

  describe('Drill with custom training set (Req 6.4)', () => {
    it('should use custom set combinations as prompts', () => {
      const customSet: KeyCombination[] = [
        { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyA' },
        { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyE' },
        { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyK' },
        { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyF' },
        { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyB' },
      ];

      const config: DrillConfig = {
        category: 'modifiers', // category is irrelevant when customSet is provided
        customSet,
      };

      engine.start(config);

      // Verify all prompts come from the custom set
      for (let i = 0; i < 30; i++) {
        const prompt = engine.getCurrentPrompt()!;
        const found = customSet.some(
          c => c.baseKey === prompt.baseKey &&
            c.modifiers.ctrl === prompt.modifiers.ctrl &&
            c.modifiers.alt === prompt.modifiers.alt &&
            c.modifiers.shift === prompt.modifiers.shift &&
            c.modifiers.meta === prompt.modifiers.meta
        );
        expect(found).toBe(true);

        // Feed correct input to advance to next prompt
        engine.handleInput(makeKeyState(prompt));
      }
    });

    it('should not use category prompts when custom set is provided', () => {
      // Provide a custom set with very specific combinations not in the default categories
      const uniqueSet: KeyCombination[] = [
        { modifiers: { ctrl: true, alt: true, shift: true, meta: true }, baseKey: 'KeyQ' },
        { modifiers: { ctrl: true, alt: true, shift: true, meta: true }, baseKey: 'KeyW' },
        { modifiers: { ctrl: true, alt: true, shift: true, meta: true }, baseKey: 'KeyE' },
        { modifiers: { ctrl: true, alt: true, shift: true, meta: true }, baseKey: 'KeyR' },
        { modifiers: { ctrl: true, alt: true, shift: true, meta: true }, baseKey: 'KeyT' },
      ];

      const config: DrillConfig = {
        category: 'numbers', // category should be ignored
        customSet: uniqueSet,
      };

      engine.start(config);

      // All prompts should be from the unique set (all have all 4 modifiers)
      for (let i = 0; i < 20; i++) {
        const prompt = engine.getCurrentPrompt()!;
        expect(prompt.modifiers.ctrl).toBe(true);
        expect(prompt.modifiers.alt).toBe(true);
        expect(prompt.modifiers.shift).toBe(true);
        expect(prompt.modifiers.meta).toBe(true);

        // Feed correct input to advance
        engine.handleInput(makeKeyState(prompt));
      }
    });

    it('should track stats correctly with custom training set', () => {
      const customSet: KeyCombination[] = [
        { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyA' },
        { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyB' },
        { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyC' },
        { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyD' },
        { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyE' },
      ];

      const config: DrillConfig = {
        category: 'combinations',
        customSet,
      };

      engine.start(config);

      // 3 correct, 2 incorrect
      for (let i = 0; i < 5; i++) {
        const prompt = engine.getCurrentPrompt()!;
        if (i < 3) {
          engine.handleInput(makeKeyState(prompt));
        } else {
          engine.handleInput(makeIncorrectKeyState());
        }
      }

      const stats = engine.stop();
      expect(stats.totalAttempts).toBe(5);
      expect(stats.accuracy).toBeCloseTo(3 / 5, 5);
      expect(stats.mostMissed.length).toBeGreaterThan(0);
      expect(stats.mostMissed.length).toBeLessThanOrEqual(3);
    });
  });
});

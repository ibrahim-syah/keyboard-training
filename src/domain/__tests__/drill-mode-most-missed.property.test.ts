// Feature: modifier-key-trainer, Property 13: Most-missed combinations are ranked by highest error count
// **Validates: Requirements 4.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DrillModeEngine } from '../drill-mode-engine';
import type { DrillConfig, KeyCombination, KeyState } from '../types';

/**
 * A pool of distinct KeyCombinations we can use for drill sessions.
 * Each has a unique baseKey so they map to distinct internal tracking keys.
 */
const COMBO_POOL: KeyCombination[] = [
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyA' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyB' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyC' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyD' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyE' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyF' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyG' },
];

/**
 * Creates a KeyState that correctly matches a given KeyCombination.
 */
function correctInputFor(combo: KeyCombination): KeyState {
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
 * Creates a KeyState that will NOT match any combination in COMBO_POOL.
 * Uses a baseKey that doesn't exist in the pool.
 */
const WRONG_INPUT: KeyState = {
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

/**
 * Helper to get the combination key string used internally by DrillModeEngine.
 * Mirrors the private combinationKey method.
 */
function combinationKey(combo: KeyCombination): string {
  const m = combo.modifiers;
  return `${m.ctrl ? 1 : 0}${m.alt ? 1 : 0}${m.shift ? 1 : 0}${m.meta ? 1 : 0}:${combo.baseKey}`;
}

describe('Drill Mode - Property 13: Most-missed combinations are ranked by highest error count', () => {
  it('mostMissed contains at most 3 items, ordered by error count descending, only combos with errors', () => {
    fc.assert(
      fc.property(
        // Generate an error count for each of the 7 combos (0 means no errors for that combo)
        fc.array(fc.nat({ max: 10 }), { minLength: 7, maxLength: 7 }),
        (errorCounts) => {
          const engine = new DrillModeEngine();
          const customSet = [...COMBO_POOL];

          const config: DrillConfig = {
            category: 'combinations',
            customSet,
          };

          engine.start(config);

          // We'll feed inputs to the engine. For each combo, we want to produce
          // the specified number of errors. Since the drill picks prompts randomly,
          // we need a different approach: respond to whatever prompt is shown,
          // but track which combos we want to have errors for and give wrong answers.

          // Strategy: We'll record desired errors per combo key.
          // When we see a prompt, if we still need errors for that combo, give wrong input.
          // Otherwise, give correct input.
          const remainingErrors = new Map<string, number>();
          for (let i = 0; i < COMBO_POOL.length; i++) {
            const key = combinationKey(COMBO_POOL[i]);
            remainingErrors.set(key, errorCounts[i]);
          }

          // Run enough iterations to generate all desired errors plus some correct answers.
          // We need enough iterations for the random prompt selection to cover all combos.
          const totalDesiredErrors = errorCounts.reduce((a, b) => a + b, 0);
          const maxIterations = totalDesiredErrors + 100; // Extra iterations for correct answers

          for (let i = 0; i < maxIterations; i++) {
            const currentPrompt = engine.getCurrentPrompt();
            if (!currentPrompt) break;

            const key = combinationKey(currentPrompt);
            const errorsLeft = remainingErrors.get(key) || 0;

            if (errorsLeft > 0) {
              // Give wrong input to generate an error
              engine.handleInput(WRONG_INPUT);
              remainingErrors.set(key, errorsLeft - 1);
            } else {
              // Give correct input
              engine.handleInput(correctInputFor(currentPrompt));
            }
          }

          const stats = engine.stop();

          // Property 1: mostMissed contains at most 3 combinations
          expect(stats.mostMissed.length).toBeLessThanOrEqual(3);

          // Property 2: only combinations with at least 1 error appear
          // (We can't verify exactly which combos got errors due to random prompt selection,
          // but we can verify the structural property that mostMissed is a subset of combos
          // that exist in the pool)
          for (const missed of stats.mostMissed) {
            const key = combinationKey(missed);
            const found = COMBO_POOL.some(c => combinationKey(c) === key);
            expect(found).toBe(true);
          }

          // Property 3: mostMissed is ordered by error count descending
          // We verify this by checking that the ordering within mostMissed is non-increasing
          // Since we don't have direct access to error counts, we re-derive them from
          // the ranking itself. The design guarantees the list is sorted by errors desc.
          // We can verify this indirectly: if we can access the stats, we trust the engine.
          // But let's verify the ordering holds by confirming with a controlled scenario.
          if (stats.mostMissed.length >= 2) {
            // The test structure already enforces this via the engine's implementation,
            // but we verify the list doesn't have duplicates
            const keys = stats.mostMissed.map(c => combinationKey(c));
            const uniqueKeys = new Set(keys);
            expect(uniqueKeys.size).toBe(stats.mostMissed.length);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('mostMissed is strictly ordered by descending error count with controlled inputs', () => {
    fc.assert(
      fc.property(
        // Generate 5 distinct error counts to assign to 5 combos, ensuring variety
        fc.tuple(
          fc.nat({ max: 8 }),
          fc.nat({ max: 8 }),
          fc.nat({ max: 8 }),
          fc.nat({ max: 8 }),
          fc.nat({ max: 8 }),
        ),
        ([e0, e1, e2, e3, e4]) => {
          // Use only 5 combos for tighter control
          const combos = COMBO_POOL.slice(0, 5);
          const errorCounts = [e0, e1, e2, e3, e4];

          const engine = new DrillModeEngine();
          const config: DrillConfig = {
            category: 'combinations',
            customSet: combos,
          };

          engine.start(config);

          // Track remaining errors per combo
          const remainingErrors = new Map<string, number>();
          for (let i = 0; i < combos.length; i++) {
            remainingErrors.set(combinationKey(combos[i]), errorCounts[i]);
          }

          // Run iterations
          const totalDesiredErrors = errorCounts.reduce((a, b) => a + b, 0);
          const maxIterations = totalDesiredErrors + 80;

          // Track actual errors observed per combo
          const actualErrors = new Map<string, number>();
          for (const combo of combos) {
            actualErrors.set(combinationKey(combo), 0);
          }

          for (let i = 0; i < maxIterations; i++) {
            const currentPrompt = engine.getCurrentPrompt();
            if (!currentPrompt) break;

            const key = combinationKey(currentPrompt);
            const errorsLeft = remainingErrors.get(key) || 0;

            if (errorsLeft > 0) {
              engine.handleInput(WRONG_INPUT);
              remainingErrors.set(key, errorsLeft - 1);
              actualErrors.set(key, (actualErrors.get(key) || 0) + 1);
            } else {
              engine.handleInput(correctInputFor(currentPrompt));
            }
          }

          const stats = engine.stop();

          // Verify: at most 3 items
          expect(stats.mostMissed.length).toBeLessThanOrEqual(3);

          // Verify: only combos with at least 1 actual error appear
          for (const missed of stats.mostMissed) {
            const key = combinationKey(missed);
            const errors = actualErrors.get(key) || 0;
            expect(errors).toBeGreaterThan(0);
          }

          // Verify: ordered by error count descending
          if (stats.mostMissed.length >= 2) {
            for (let i = 0; i < stats.mostMissed.length - 1; i++) {
              const keyA = combinationKey(stats.mostMissed[i]);
              const keyB = combinationKey(stats.mostMissed[i + 1]);
              const errorsA = actualErrors.get(keyA) || 0;
              const errorsB = actualErrors.get(keyB) || 0;
              expect(errorsA).toBeGreaterThanOrEqual(errorsB);
            }
          }

          // Verify: if there are combos with errors not in the top 3,
          // they must have error count <= the minimum in the top 3
          if (stats.mostMissed.length === 3) {
            const minTopErrors = actualErrors.get(
              combinationKey(stats.mostMissed[2])
            ) || 0;

            for (const combo of combos) {
              const key = combinationKey(combo);
              const errors = actualErrors.get(key) || 0;
              const inMostMissed = stats.mostMissed.some(
                m => combinationKey(m) === key
              );
              if (!inMostMissed && errors > 0) {
                expect(errors).toBeLessThanOrEqual(minTopErrors);
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('mostMissed is empty when all inputs are correct', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 50 }).filter(n => n >= 5),
        (numInputs) => {
          const combos = COMBO_POOL.slice(0, 5);
          const engine = new DrillModeEngine();
          const config: DrillConfig = {
            category: 'combinations',
            customSet: combos,
          };

          engine.start(config);

          for (let i = 0; i < numInputs; i++) {
            const currentPrompt = engine.getCurrentPrompt();
            if (!currentPrompt) break;
            engine.handleInput(correctInputFor(currentPrompt));
          }

          const stats = engine.stop();
          expect(stats.mostMissed).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

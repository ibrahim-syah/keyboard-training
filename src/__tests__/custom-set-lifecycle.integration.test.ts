/**
 * Integration tests for custom training set lifecycle.
 *
 * Tests the full CRUD lifecycle: create → edit → export → import → use in drill → delete
 * Tests import validation with malformed JSON
 * Tests size bounds enforcement
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6, 6.7
 */

// Polyfill localStorage for jsdom environments
function createLocalStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem(key: string): string | null {
      return store[key] ?? null;
    },
    setItem(key: string, value: string): void {
      store[key] = String(value);
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      store = {};
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
  };
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createLocalStorageMock(),
    writable: true,
  });
}

import { describe, it, expect, beforeEach } from 'vitest';
import {
  create,
  update,
  deleteSet,
  getAll,
  getById,
  exportToJSON,
  importFromJSON,
} from '../domain/custom-set-manager';
import { DrillModeEngine } from '../domain/drill-mode-engine';
import type { KeyCombination } from '../domain/types';

/**
 * Helper: generate N valid key combinations for testing.
 */
function generateCombos(count: number): KeyCombination[] {
  const baseKeys = [
    'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG',
    'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN',
    'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU',
    'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ',
    'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4',
    'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9',
    'F10', 'F11', 'F12',
    'Space', 'Enter', 'Tab', 'Escape', 'Backspace', 'Delete',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  ];

  const combos: KeyCombination[] = [];
  for (let i = 0; i < count; i++) {
    combos.push({
      modifiers: {
        ctrl: i % 4 === 0,
        alt: i % 3 === 0,
        shift: i % 2 === 0,
        meta: i % 5 === 0,
      },
      baseKey: baseKeys[i % baseKeys.length],
    });
  }
  return combos;
}

describe('Custom Set Lifecycle - Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Full CRUD lifecycle: create → edit → export → import → use in drill → delete', () => {
    it('should support the complete custom set lifecycle', () => {
      // Step 1: Create a custom set
      const combos = generateCombos(10);
      const created = create('Test Set', combos);

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Test Set');
      expect(created.combinations).toHaveLength(10);
      expect(created.combinations).toEqual(combos);
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();

      // Verify getAll() includes the created set
      const allSets = getAll();
      expect(allSets).toHaveLength(1);
      expect(allSets[0].id).toBe(created.id);
      expect(allSets[0].name).toBe('Test Set');

      // Step 2: Update name and combos
      const newCombos = generateCombos(8);
      const updated = update(created.id, {
        name: 'Updated Set',
        combinations: newCombos,
      });

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe('Updated Set');
      expect(updated.combinations).toHaveLength(8);
      expect(updated.combinations).toEqual(newCombos);

      // Verify updated values are persisted
      const retrieved = getById(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe('Updated Set');
      expect(retrieved!.combinations).toHaveLength(8);

      // Step 3: Export to JSON
      const jsonString = exportToJSON(created.id);
      const parsed = JSON.parse(jsonString);
      expect(parsed.version).toBe(1);
      expect(parsed.name).toBe('Updated Set');
      expect(parsed.combinations).toHaveLength(8);

      // Step 4: Import from JSON
      const imported = importFromJSON(jsonString);
      expect(imported.name).toBe('Updated Set');
      expect(imported.combinations).toHaveLength(8);
      // Verify imported has same combos content
      for (let i = 0; i < imported.combinations.length; i++) {
        expect(imported.combinations[i].baseKey).toBe(newCombos[i].baseKey);
        expect(imported.combinations[i].modifiers.ctrl).toBe(newCombos[i].modifiers.ctrl);
        expect(imported.combinations[i].modifiers.alt).toBe(newCombos[i].modifiers.alt);
        expect(imported.combinations[i].modifiers.shift).toBe(newCombos[i].modifiers.shift);
        expect(imported.combinations[i].modifiers.meta).toBe(newCombos[i].modifiers.meta);
      }

      // Now there should be 2 sets (original updated + imported copy)
      expect(getAll()).toHaveLength(2);

      // Step 5: Use the imported set in DrillModeEngine.start()
      const engine = new DrillModeEngine();
      engine.start({
        category: 'combinations',
        customSet: imported.combinations,
      });

      expect(engine.isActive()).toBe(true);
      expect(engine.getCurrentPrompt()).not.toBeNull();
      // The current prompt should be one of the imported combinations
      const currentPrompt = engine.getCurrentPrompt()!;
      const matchesPool = imported.combinations.some(
        (c) =>
          c.baseKey === currentPrompt.baseKey &&
          c.modifiers.ctrl === currentPrompt.modifiers.ctrl &&
          c.modifiers.alt === currentPrompt.modifiers.alt &&
          c.modifiers.shift === currentPrompt.modifiers.shift &&
          c.modifiers.meta === currentPrompt.modifiers.meta,
      );
      expect(matchesPool).toBe(true);
      engine.stop();

      // Step 6: Delete the original set and verify removed
      deleteSet(created.id);
      expect(getById(created.id)).toBeNull();
      expect(getAll()).toHaveLength(1); // Only the imported one remains

      // Delete the imported set too
      deleteSet(imported.id);
      expect(getAll()).toHaveLength(0);
    });
  });

  describe('Import validation with malformed JSON', () => {
    it('should throw on malformed JSON string', () => {
      expect(() => importFromJSON('not valid json {')).toThrow(
        'Invalid JSON: unable to parse input',
      );
    });

    it('should throw on JSON missing version field', () => {
      const noVersion = JSON.stringify({
        name: 'Test',
        combinations: [
          { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyA' },
          { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyB' },
          { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyC' },
          { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyD' },
          { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyE' },
        ],
      });

      expect(() => importFromJSON(noVersion)).toThrow(
        'Invalid format: missing or unsupported version field',
      );
    });

    it('should throw with specific error listing invalid key codes', () => {
      const invalidKeyCodes = JSON.stringify({
        version: 1,
        name: 'Invalid Keys',
        combinations: [
          { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyA' },
          { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'FakeKey1' },
          { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyC' },
          { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'BadCode' },
          { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyE' },
        ],
      });

      expect(() => importFromJSON(invalidKeyCodes)).toThrow('Invalid key codes: FakeKey1, BadCode');
    });
  });

  describe('Size bounds enforcement', () => {
    it('should throw "at least 5" when creating with 4 combos', () => {
      const combos = generateCombos(4);
      expect(() => create('Too Few', combos)).toThrow('at least 5');
    });

    it('should throw "at most 200" when creating with 201 combos', () => {
      const combos = generateCombos(201);
      expect(() => create('Too Many', combos)).toThrow('at most 200');
    });

    it('should succeed when creating with exactly 5 combos', () => {
      const combos = generateCombos(5);
      const set = create('Min Bound', combos);
      expect(set.name).toBe('Min Bound');
      expect(set.combinations).toHaveLength(5);
    });

    it('should succeed when creating with exactly 200 combos', () => {
      const combos = generateCombos(200);
      const set = create('Max Bound', combos);
      expect(set.name).toBe('Max Bound');
      expect(set.combinations).toHaveLength(200);
    });
  });
});

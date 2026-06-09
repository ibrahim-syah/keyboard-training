// Feature: modifier-key-trainer, Property 20: Custom set size bounded to [5, 200]
// **Validates: Requirements 6.6**

// Polyfill localStorage for jsdom environments (jsdom 29 + Node 26 doesn't expose it)
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
import * as fc from 'fast-check';
import { create } from '../custom-set-manager';
import type { KeyCombination } from '../types';

/**
 * Generate a valid KeyCombination for building test sets.
 */
function makeKeyCombination(index: number): KeyCombination {
  const baseKeys = [
    'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG',
    'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN',
    'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU',
    'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ',
  ];
  return {
    modifiers: {
      ctrl: index % 2 === 0,
      alt: index % 3 === 0,
      shift: index % 5 === 0,
      meta: index % 7 === 0,
    },
    baseKey: baseKeys[index % baseKeys.length],
  };
}

/**
 * Generate an array of KeyCombination objects of the specified length.
 */
function makeCombinations(count: number): KeyCombination[] {
  return Array.from({ length: count }, (_, i) => makeKeyCombination(i));
}

describe('Custom Set Manager - Property 20: Custom set size bounded to [5, 200]', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should succeed when combination count is in [5, 200]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 200 }),
        (count) => {
          localStorage.clear();
          const combinations = makeCombinations(count);

          expect(() => create('Test Set', combinations)).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should throw with minimum error when combination count is below 5', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),
        (count) => {
          localStorage.clear();
          const combinations = makeCombinations(count);

          expect(() => create('Test Set', combinations)).toThrow(
            /at least 5/,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should throw with maximum error when combination count exceeds 200', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 201, max: 250 }),
        (count) => {
          localStorage.clear();
          const combinations = makeCombinations(count);

          expect(() => create('Test Set', combinations)).toThrow(
            /at most 200/,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should accept or reject based solely on combination count across full range [0, 250]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 250 }),
        (count) => {
          localStorage.clear();
          const combinations = makeCombinations(count);

          if (count >= 5 && count <= 200) {
            expect(() => create('Test Set', combinations)).not.toThrow();
          } else {
            expect(() => create('Test Set', combinations)).toThrow();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

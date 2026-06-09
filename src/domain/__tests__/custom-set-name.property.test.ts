// Feature: modifier-key-trainer, Property 18: Custom set name validation accepts trimmed names of length 1-50
// **Validates: Requirements 6.2**

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
import * as fc from 'fast-check';
import { create } from '../custom-set-manager';
import type { KeyCombination } from '../types';

/**
 * A fixed valid array of 5 combinations to pass size validation.
 */
const validCombinations: KeyCombination[] = [
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyA' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyB' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyC' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyD' },
  { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyE' },
];

describe('Custom Set Manager - Property 18: Custom set name validation accepts trimmed names of length 1-50', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should accept names whose trimmed length is between 1 and 50 and store the trimmed version', () => {
    // Generate whitespace padding
    const whitespaceArb = fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 5 })
      .map((chars) => chars.join(''));

    // Generate strings with optional leading/trailing whitespace whose trimmed length is 1-50
    const validNameArb = fc
      .tuple(
        whitespaceArb,
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length >= 1 && s.trim().length <= 50),
        whitespaceArb,
      )
      .map(([leading, core, trailing]) => leading + core + trailing)
      .filter((s) => s.trim().length >= 1 && s.trim().length <= 50);

    fc.assert(
      fc.property(validNameArb, (name) => {
        localStorage.clear();

        const result = create(name, validCombinations);
        const trimmed = name.trim();

        // The stored name should be the trimmed version
        expect(result.name).toBe(trimmed);
        // Trimmed length should be between 1 and 50
        expect(trimmed.length).toBeGreaterThanOrEqual(1);
        expect(trimmed.length).toBeLessThanOrEqual(50);
      }),
      { numRuns: 100 },
    );
  });

  it('should reject names whose trimmed length is 0 (empty after trimming)', () => {
    // Generate strings that become empty after trimming (only whitespace)
    const emptyAfterTrimArb = fc.array(
      fc.constantFrom(' ', '\t', '\n', '\r'),
      { minLength: 0, maxLength: 20 },
    ).map((chars) => chars.join(''));

    fc.assert(
      fc.property(emptyAfterTrimArb, (name) => {
        localStorage.clear();

        expect(() => create(name, validCombinations)).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('should reject names whose trimmed length exceeds 50', () => {
    // Generate whitespace padding
    const whitespaceArb = fc.array(fc.constantFrom(' ', '\t'), { minLength: 0, maxLength: 3 })
      .map((chars) => chars.join(''));

    // Generate strings whose trimmed length is > 50
    const tooLongNameArb = fc
      .tuple(
        whitespaceArb,
        // Generate a non-whitespace core of length 51-100
        fc.string({ minLength: 51, maxLength: 100 }).filter((s) => s.trim().length > 50),
        whitespaceArb,
      )
      .map(([leading, core, trailing]) => leading + core + trailing)
      .filter((s) => s.trim().length > 50);

    fc.assert(
      fc.property(tooLongNameArb, (name) => {
        localStorage.clear();

        expect(() => create(name, validCombinations)).toThrow();
      }),
      { numRuns: 100 },
    );
  });
});

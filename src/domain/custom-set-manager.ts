/**
 * Custom Set Manager for the Modifier Key Trainer application.
 *
 * Handles CRUD operations for user-defined training sets,
 * JSON import/export, and provides access to preset training sets.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import type {
  CustomTrainingSet,
  KeyCombination,
  TrainingSetExportFormat,
} from './types';
import { get, set } from '../infrastructure/storage-adapter';
import { PRESETS } from '../data/presets';

const CUSTOM_SETS_KEY = 'custom_sets';

/** Minimum number of combinations allowed in a custom set. */
const MIN_COMBINATIONS = 5;

/** Maximum number of combinations allowed in a custom set. */
const MAX_COMBINATIONS = 200;

/** Maximum length for a custom set name (after trimming). */
const MAX_NAME_LENGTH = 50;

/**
 * Valid base key codes recognized by the application.
 */
const VALID_KEY_CODES = new Set([
  // Letters KeyA-KeyZ
  'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG',
  'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN',
  'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU',
  'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ',
  // Digits Digit0-Digit9
  'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4',
  'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
  // Function keys F1-F12
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  // Arrow keys
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  // Special keys
  'Space', 'Enter', 'Tab', 'Escape', 'Backspace', 'Delete',
  'Home', 'End', 'PageUp', 'PageDown',
  // Modifier codes (for single-modifier prompts)
  'ControlLeft', 'ControlRight',
  'AltLeft', 'AltRight',
  'ShiftLeft', 'ShiftRight',
  'MetaLeft', 'MetaRight',
  // Additional commonly used codes
  'BracketLeft', 'BracketRight', 'Backquote', 'Slash',
  'Backslash', 'Minus', 'Equal', 'Semicolon', 'Quote',
  'Comma', 'Period', 'IntlBackslash',
]);

/**
 * Validate a custom set name.
 * Trims whitespace and checks length is between 1 and 50 characters.
 *
 * @throws Error if name is empty after trimming or exceeds 50 characters
 */
function validateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Name cannot be empty');
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
  }
  return trimmed;
}

/**
 * Validate the number of combinations in a custom set.
 *
 * @throws Error if count is below minimum or above maximum
 */
function validateCombinationCount(count: number): void {
  if (count < MIN_COMBINATIONS) {
    throw new Error(
      `Custom set must contain at least ${MIN_COMBINATIONS} combinations`,
    );
  }
  if (count > MAX_COMBINATIONS) {
    throw new Error(
      `Custom set must contain at most ${MAX_COMBINATIONS} combinations`,
    );
  }
}

/**
 * Validate that a base key code is recognized.
 */
function isValidKeyCode(code: string): boolean {
  return VALID_KEY_CODES.has(code);
}

/**
 * Load all custom training sets from storage.
 */
function loadSets(): CustomTrainingSet[] {
  return get<CustomTrainingSet[]>(CUSTOM_SETS_KEY, []);
}

/**
 * Persist the full list of custom training sets to storage.
 */
function saveSets(sets: CustomTrainingSet[]): boolean {
  return set(CUSTOM_SETS_KEY, sets);
}

/**
 * Create a new custom training set.
 *
 * @param name - Name for the set (will be trimmed, 1-50 chars)
 * @param combinations - Array of key combinations (5-200 items)
 * @returns The newly created CustomTrainingSet
 * @throws Error if name or combination count validation fails
 */
export function create(
  name: string,
  combinations: KeyCombination[],
): CustomTrainingSet {
  const validatedName = validateName(name);
  validateCombinationCount(combinations.length);

  const now = new Date().toISOString();
  const newSet: CustomTrainingSet = {
    id: crypto.randomUUID(),
    name: validatedName,
    combinations,
    createdAt: now,
    updatedAt: now,
  };

  const sets = loadSets();
  sets.push(newSet);
  saveSets(sets);

  return newSet;
}

/**
 * Update an existing custom training set.
 *
 * @param id - The ID of the set to update
 * @param changes - Partial changes to apply (name and/or combinations)
 * @returns The updated CustomTrainingSet
 * @throws Error if set not found or validation fails
 */
export function update(
  id: string,
  changes: Partial<Pick<CustomTrainingSet, 'name' | 'combinations'>>,
): CustomTrainingSet {
  const sets = loadSets();
  const index = sets.findIndex((s) => s.id === id);

  if (index === -1) {
    throw new Error(`Custom set with id "${id}" not found`);
  }

  const existing = sets[index];

  if (changes.name !== undefined) {
    existing.name = validateName(changes.name);
  }

  if (changes.combinations !== undefined) {
    validateCombinationCount(changes.combinations.length);
    existing.combinations = changes.combinations;
  }

  existing.updatedAt = new Date().toISOString();
  sets[index] = existing;
  saveSets(sets);

  return existing;
}

/**
 * Delete a custom training set by ID.
 *
 * @param id - The ID of the set to delete
 * @throws Error if set not found
 */
export function deleteSet(id: string): void {
  const sets = loadSets();
  const index = sets.findIndex((s) => s.id === id);

  if (index === -1) {
    throw new Error(`Custom set with id "${id}" not found`);
  }

  sets.splice(index, 1);
  saveSets(sets);
}

/**
 * Get all user-created custom training sets.
 */
export function getAll(): CustomTrainingSet[] {
  return loadSets();
}

/**
 * Get a single custom training set by ID.
 *
 * @returns The set if found, or null if not found
 */
export function getById(id: string): CustomTrainingSet | null {
  const sets = loadSets();
  return sets.find((s) => s.id === id) ?? null;
}

/**
 * Get all preset training sets as CustomTrainingSet-compatible objects.
 * Presets are read-only and bundled with the application.
 */
export function getPresets(): CustomTrainingSet[] {
  return PRESETS.map((preset) => ({
    id: preset.id,
    name: preset.name,
    combinations: preset.combinations,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }));
}

/**
 * Export a custom training set to JSON format.
 *
 * @param id - The ID of the set to export
 * @returns A JSON string in TrainingSetExportFormat
 * @throws Error if set not found
 */
export function exportToJSON(id: string): string {
  const trainingSet = getById(id);

  if (trainingSet === null) {
    throw new Error(`Custom set with id "${id}" not found`);
  }

  const exportData: TrainingSetExportFormat = {
    version: 1,
    name: trainingSet.name,
    combinations: trainingSet.combinations.map((combo) => ({
      modifiers: {
        ctrl: combo.modifiers.ctrl,
        alt: combo.modifiers.alt,
        shift: combo.modifiers.shift,
        meta: combo.modifiers.meta,
      },
      baseKey: combo.baseKey,
    })),
  };

  return JSON.stringify(exportData);
}

/**
 * Import a custom training set from a JSON string.
 *
 * Validates the JSON structure, field types, and key codes.
 *
 * @param json - A JSON string in TrainingSetExportFormat
 * @returns The newly created CustomTrainingSet
 * @throws Error if JSON is malformed, structure is invalid, or key codes are unrecognized
 */
export function importFromJSON(json: string): CustomTrainingSet {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON: unable to parse input');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid format: expected a JSON object');
  }

  const data = parsed as Record<string, unknown>;

  // Validate version field
  if (!('version' in data) || data.version !== 1) {
    throw new Error('Invalid format: missing or unsupported version field');
  }

  // Validate name field
  if (!('name' in data) || typeof data.name !== 'string') {
    throw new Error('Invalid format: missing or invalid "name" field');
  }

  // Validate combinations field
  if (!('combinations' in data) || !Array.isArray(data.combinations)) {
    throw new Error('Invalid format: missing or invalid "combinations" field');
  }

  const combinations = data.combinations as unknown[];
  const invalidKeyCodes: string[] = [];
  const validCombinations: KeyCombination[] = [];

  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];

    if (typeof combo !== 'object' || combo === null || Array.isArray(combo)) {
      throw new Error(
        `Invalid format: combination at index ${i} is not a valid object`,
      );
    }

    const entry = combo as Record<string, unknown>;

    // Validate baseKey
    if (!('baseKey' in entry) || typeof entry.baseKey !== 'string') {
      throw new Error(
        `Invalid format: combination at index ${i} has missing or invalid "baseKey"`,
      );
    }

    // Validate modifiers
    if (
      !('modifiers' in entry) ||
      typeof entry.modifiers !== 'object' ||
      entry.modifiers === null ||
      Array.isArray(entry.modifiers)
    ) {
      throw new Error(
        `Invalid format: combination at index ${i} has missing or invalid "modifiers"`,
      );
    }

    const mods = entry.modifiers as Record<string, unknown>;

    if (typeof mods.ctrl !== 'boolean') {
      throw new Error(
        `Invalid format: combination at index ${i} has invalid "modifiers.ctrl"`,
      );
    }
    if (typeof mods.alt !== 'boolean') {
      throw new Error(
        `Invalid format: combination at index ${i} has invalid "modifiers.alt"`,
      );
    }
    if (typeof mods.shift !== 'boolean') {
      throw new Error(
        `Invalid format: combination at index ${i} has invalid "modifiers.shift"`,
      );
    }
    if (typeof mods.meta !== 'boolean') {
      throw new Error(
        `Invalid format: combination at index ${i} has invalid "modifiers.meta"`,
      );
    }

    // Validate key code
    if (!isValidKeyCode(entry.baseKey)) {
      invalidKeyCodes.push(entry.baseKey);
    }

    validCombinations.push({
      modifiers: {
        ctrl: mods.ctrl as boolean,
        alt: mods.alt as boolean,
        shift: mods.shift as boolean,
        meta: mods.meta as boolean,
      },
      baseKey: entry.baseKey,
    });
  }

  if (invalidKeyCodes.length > 0) {
    throw new Error(
      `Invalid key codes: ${invalidKeyCodes.join(', ')}`,
    );
  }

  // Use the create function which handles name/size validation and persistence
  return create(data.name as string, validCombinations);
}

/**
 * Core domain types for the Modifier Key Trainer application.
 *
 * These types model key capture state, exercise configuration,
 * progress tracking, custom training sets, and platform info.
 */

// --- Key Capture Types ---

/**
 * Represents the full state of currently held keys,
 * distinguishing left/right modifier variants.
 */
export interface KeyState {
  modifiers: {
    ctrlLeft: boolean;
    ctrlRight: boolean;
    altLeft: boolean;
    altRight: boolean;
    shiftLeft: boolean;
    shiftRight: boolean;
    metaLeft: boolean;
    metaRight: boolean;
  };
  /** event.code for non-modifier key, null if only modifiers held */
  baseKey: string | null;
}

/**
 * A target key combination to be matched against user input.
 */
export interface KeyCombination {
  modifiers: ModifierSet;
  /** event.code value (e.g., "KeyC", "Digit1", "F5") */
  baseKey: string;
}

/**
 * Simplified modifier flags (no left/right distinction).
 */
export interface ModifierSet {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

/**
 * Result of comparing a user's actual key state against an expected combination.
 */
export interface MatchResult {
  correct: boolean;
  expected: KeyCombination;
  actual: KeyState;
  timestamp: number;
}

// --- Category and Difficulty Types ---

/**
 * The available key categories for exercises and drills.
 */
export type KeyCategory =
  | 'modifiers'
  | 'numbers'
  | 'function-keys'
  | 'navigation'
  | 'combinations';

/**
 * Difficulty levels for combination complexity.
 * Level 1: two-key with Cmd/Shift
 * Level 2: two-key with Ctrl/Alt
 * Level 3: three-key combinations
 * Level 4: four-key combinations
 */
export type DifficultyLevel = 1 | 2 | 3 | 4;

// --- Exercise Types ---

/**
 * Configuration for starting an exercise.
 */
export interface ExerciseConfig {
  category: KeyCategory;
  /** Number of prompts, clamped to [10, 50] */
  promptCount: number;
  prompts: KeyCombination[];
}

/**
 * Current state of a running exercise.
 */
export interface ExerciseState {
  currentPromptIndex: number;
  totalPrompts: number;
  currentPrompt: KeyCombination;
  results: PromptResult[];
  startTime: number;
  status: 'idle' | 'active' | 'complete';
}

/**
 * Result of a single prompt within an exercise.
 */
export interface PromptResult {
  prompt: KeyCombination;
  attempts: number;
  responseTimeMs: number;
  correct: boolean;
}

// --- Drill Mode Types ---

/**
 * Configuration for starting a drill session.
 */
export interface DrillConfig {
  category: KeyCategory;
  customSet?: KeyCombination[];
}

/**
 * Summary statistics for a completed drill session.
 */
export interface DrillStats {
  accuracy: number;
  avgResponseTimeMs: number;
  /** Up to 3 most-missed combinations */
  mostMissed: KeyCombination[];
  totalAttempts: number;
}

// --- Progress and Session Types ---

/**
 * A persisted record of a completed training session.
 */
export interface SessionRecord {
  id: string;
  /** ISO 8601 date string */
  date: string;
  category: KeyCategory;
  accuracy: number;
  avgResponseTimeMs: number;
  promptCount: number;
  perCombinationData: CombinationStat[];
}

/**
 * Per-combination statistics within a session.
 */
export interface CombinationStat {
  combination: KeyCombination;
  attempts: number;
  correctCount: number;
  avgResponseTimeMs: number;
}

/**
 * Criteria required to unlock the next difficulty level.
 */
export interface LevelCriteria {
  minAccuracy: number;
  maxResponseTimeMs: number;
  minAttempts: number;
}

/**
 * Progress state for a single category.
 */
export interface CategoryProgress {
  currentLevel: DifficultyLevel;
  unlockedLevels: DifficultyLevel[];
  manualOverride: boolean;
  levelStats: Record<DifficultyLevel, { accuracy: number; avgResponseTimeMs: number; attempts: number }>;
}

// --- Custom Training Set Types ---

/**
 * A user-defined training set with metadata.
 */
export interface CustomTrainingSet {
  id: string;
  /** 1-50 characters, trimmed */
  name: string;
  combinations: KeyCombination[];
  createdAt: string;
  updatedAt: string;
}

/**
 * JSON export/import format for training sets.
 */
export interface TrainingSetExportFormat {
  version: 1;
  name: string;
  combinations: Array<{
    modifiers: { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean };
    baseKey: string;
  }>;
}

// --- Settings and Platform Types ---

/**
 * User-configurable settings persisted in localStorage.
 */
export interface StoredSettings {
  defaultPromptCount: number;
  showFnKeyHint: boolean;
  theme: 'light' | 'dark';
}

/**
 * Information about the user's operating system platform.
 */
export interface PlatformInfo {
  isMacOS: boolean;
  userAgent: string;
}

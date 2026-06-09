import type { KeyCategory, DifficultyLevel, CategoryProgress } from '../domain/types';

/**
 * Level labels mapping difficulty level to descriptive name.
 */
const LEVEL_LABELS: Record<DifficultyLevel, string> = {
  1: 'Cmd/Shift',
  2: 'Ctrl/Alt',
  3: 'Three-key',
  4: 'Four-key',
};

/**
 * Progression criteria thresholds (must match difficulty-manager.ts).
 */
const PROGRESSION_CRITERIA = {
  minAccuracy: 0.9,
  maxResponseTimeMs: 1000,
  minAttempts: 20,
};

interface DifficultyIndicatorProps {
  category: KeyCategory;
  currentLevel: DifficultyLevel;
  progress: CategoryProgress;
}

/**
 * DifficultyIndicator shows the current difficulty level and progress
 * toward unlocking the next level. Displays a progress bar based on
 * accuracy, speed, and attempt criteria.
 *
 * - If manual override is active or all levels unlocked, shows "All levels available"
 * - If category has no history (new category), shows single-key notice
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export function DifficultyIndicator({ currentLevel, progress }: DifficultyIndicatorProps) {
  const hasHistory = Object.values(progress.levelStats).some((s) => s.attempts > 0);
  const allUnlocked = progress.unlockedLevels.length === 4 || progress.manualOverride;

  // Calculate progress toward next level
  const currentStats = progress.levelStats[currentLevel];
  const progressPercent = calculateProgressPercent(currentStats);

  // Check if first 10 prompts scenario (new category, no history)
  const isNewCategory = !hasHistory;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
      {/* Level header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Difficulty
          </span>
          <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            Level {currentLevel}: {LEVEL_LABELS[currentLevel]}
          </span>
        </div>
        {allUnlocked && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
            All levels available
          </span>
        )}
      </div>

      {/* Progress bar toward next level (only show if not at max and not all unlocked) */}
      {!allUnlocked && currentLevel < 4 && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Progress to Level {currentLevel + 1}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
            <span>
              Accuracy: {Math.round(currentStats.accuracy * 100)}% / {Math.round(PROGRESSION_CRITERIA.minAccuracy * 100)}%
            </span>
            <span>
              Speed: {Math.round(currentStats.avgResponseTimeMs)}ms / {PROGRESSION_CRITERIA.maxResponseTimeMs}ms
            </span>
            <span>
              Attempts: {currentStats.attempts} / {PROGRESSION_CRITERIA.minAttempts}
            </span>
          </div>
        </div>
      )}

      {/* Single-key notice for new categories */}
      {isNewCategory && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2">
          <span className="text-blue-500 dark:text-blue-400 text-sm">ℹ️</span>
          <span className="text-xs text-blue-700 dark:text-blue-300">
            Starting with single-key prompts to build familiarity
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Calculate the overall progress percentage toward the next level.
 * Progress is the average of three sub-criteria progress values,
 * each clamped to [0, 100].
 */
function calculateProgressPercent(stats: { accuracy: number; avgResponseTimeMs: number; attempts: number }): number {
  // Accuracy progress: current accuracy / required accuracy (capped at 100%)
  const accuracyProgress = Math.min(
    (stats.accuracy / PROGRESSION_CRITERIA.minAccuracy) * 100,
    100,
  );

  // Speed progress: inverse scale — lower is better
  // At 0ms = 100%, at maxResponseTimeMs = 100%, above = proportionally less
  let speedProgress: number;
  if (stats.avgResponseTimeMs === 0 && stats.attempts === 0) {
    speedProgress = 0;
  } else if (stats.avgResponseTimeMs <= PROGRESSION_CRITERIA.maxResponseTimeMs) {
    speedProgress = 100;
  } else {
    // Scale from maxResponseTimeMs (100%) to 2x maxResponseTimeMs (0%)
    speedProgress = Math.max(
      0,
      (1 - (stats.avgResponseTimeMs - PROGRESSION_CRITERIA.maxResponseTimeMs) / PROGRESSION_CRITERIA.maxResponseTimeMs) * 100,
    );
  }

  // Attempts progress: current / required (capped at 100%)
  const attemptsProgress = Math.min(
    (stats.attempts / PROGRESSION_CRITERIA.minAttempts) * 100,
    100,
  );

  return (accuracyProgress + speedProgress + attemptsProgress) / 3;
}

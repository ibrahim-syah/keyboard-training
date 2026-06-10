import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { KeyCategory, KeyCombination, KeyState, SessionRecord, CombinationStat, DifficultyLevel } from '../domain/types';
import { ExerciseController } from '../domain/exercise-controller';
import { createKeyCaptureEngine } from '../domain/key-capture-engine';
import { getPromptsForCategory, getMixedPrompts } from '../domain/prompt-selector';
import { formatKeyCombination } from '../domain/key-display';
import { saveSession } from '../domain/progress-tracker';
import { getAvailableLevels, getPromptsForLevel, getCategoryProgress, overrideAll } from '../domain/difficulty-manager';
import { PromptDisplay, type FeedbackType } from '../components/PromptDisplay';
import { VisualKeyboard } from '../components/VisualKeyboard';
import { DifficultyIndicator } from '../components/DifficultyIndicator';
import { isOsReserved } from '../data/os-reserved';

/**
 * All available categories for exercise selection.
 */
const CATEGORIES: { id: KeyCategory | 'mixed'; label: string }[] = [
  { id: 'modifiers', label: 'Modifier Keys' },
  { id: 'numbers', label: 'Number Keys' },
  { id: 'function-keys', label: 'Function Keys' },
  { id: 'navigation', label: 'Navigation Keys' },
  { id: 'combinations', label: 'Combinations' },
  { id: 'mixed', label: 'Mixed Mode' },
];

/**
 * Derives the set of event.code values to highlight on the visual keyboard
 * for a given KeyCombination.
 */
function getHighlightedKeyCodes(combination: KeyCombination): string[] {
  const codes = new Set<string>();
  const { modifiers, baseKey } = combination;

  // Add modifier keys, but only if the baseKey isn't already that specific modifier
  if (modifiers.ctrl && baseKey !== 'ControlLeft' && baseKey !== 'ControlRight') {
    codes.add('ControlLeft');
  }
  if (modifiers.alt && baseKey !== 'AltLeft' && baseKey !== 'AltRight') {
    codes.add('AltLeft');
  }
  if (modifiers.shift && baseKey !== 'ShiftLeft' && baseKey !== 'ShiftRight') {
    codes.add('ShiftLeft');
  }
  if (modifiers.meta && baseKey !== 'MetaLeft' && baseKey !== 'MetaRight') {
    codes.add('MetaLeft');
  }

  // Always add the baseKey itself
  if (baseKey) {
    codes.add(baseKey);
  }

  return Array.from(codes);
}

/**
 * Maps KeyState modifier flags to event.code values for held keys display.
 */
function getHeldKeyCodes(keyState: KeyState): string[] {
  const codes: string[] = [];
  const { modifiers, baseKey } = keyState;

  if (modifiers.ctrlLeft) codes.push('ControlLeft');
  if (modifiers.ctrlRight) codes.push('ControlRight');
  if (modifiers.altLeft) codes.push('AltLeft');
  if (modifiers.altRight) codes.push('AltRight');
  if (modifiers.shiftLeft) codes.push('ShiftLeft');
  if (modifiers.shiftRight) codes.push('ShiftRight');
  if (modifiers.metaLeft) codes.push('MetaLeft');
  if (modifiers.metaRight) codes.push('MetaRight');

  if (baseKey) {
    codes.push(baseKey);
  }

  return codes;
}

/**
 * Formats a KeyState into a display string showing what keys were pressed.
 */
function formatKeyState(keyState: KeyState): string {
  const parts: string[] = [];
  const { modifiers, baseKey } = keyState;

  if (modifiers.ctrlLeft || modifiers.ctrlRight) parts.push('⌃');
  if (modifiers.altLeft || modifiers.altRight) parts.push('⌥');
  if (modifiers.shiftLeft || modifiers.shiftRight) parts.push('⇧');
  if (modifiers.metaLeft || modifiers.metaRight) parts.push('⌘');

  if (baseKey) {
    // Create a minimal KeyCombination just to format the base key
    const tempCombo: KeyCombination = {
      modifiers: { ctrl: false, alt: false, shift: false, meta: false },
      baseKey,
    };
    parts.push(formatKeyCombination(tempCombo));
  }

  return parts.join('') || '(no keys)';
}

/**
 * ExercisePage implements the structured exercise mode with category selection,
 * prompt count configuration, and exercise execution with completion summary.
 *
 * Requirements: 1.4, 2.1, 2.3, 2.4, 2.5, 3.1, 3.3, 3.4, 5.1, 8.3
 */
export default function ExercisePage() {
  // --- Setup state ---
  // Read category from URL query param (e.g., /exercise?category=modifiers)
  const initialCategory = (() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const cat = params.get('category');
    const validCategories = ['modifiers', 'numbers', 'function-keys', 'navigation', 'combinations', 'mixed'];
    if (cat && validCategories.includes(cat)) return cat as KeyCategory | 'mixed';
    return 'combinations' as KeyCategory | 'mixed';
  })();
  const [selectedCategory, setSelectedCategory] = useState<KeyCategory | 'mixed'>(initialCategory);
  const [promptCount, setPromptCount] = useState(20);
  const [mode, setMode] = useState<'setup' | 'active' | 'complete'>('setup');
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>(1);
  const [manualOverride, setManualOverride] = useState(false);

  // --- Exercise state ---
  const [currentPrompt, setCurrentPrompt] = useState<KeyCombination | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalPrompts, setTotalPrompts] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [pressedKeys, setPressedKeys] = useState<string | null>(null);
  const [heldKeys, setHeldKeys] = useState<string[]>([]);
  const [inactive, setInactive] = useState(false);

  // --- Completion state ---
  const [accuracy, setAccuracy] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const exerciseCategoryRef = useRef<KeyCategory>('combinations');

  // --- OS-reserved notification ---
  const [reservedNotice, setReservedNotice] = useState<string | null>(null);

  // --- Difficulty progression ---
  const effectiveCategory: KeyCategory = selectedCategory === 'mixed' ? 'combinations' : selectedCategory;
  const availableLevels = useMemo((): DifficultyLevel[] => {
    if (manualOverride) return [1, 2, 3, 4];
    return getAvailableLevels(effectiveCategory);
  }, [effectiveCategory, manualOverride]);
  const categoryProgress = useMemo(() => getCategoryProgress(effectiveCategory), [effectiveCategory]);

  // Handle manual override toggle
  const handleOverrideToggle = useCallback(() => {
    const newOverride = !manualOverride;
    setManualOverride(newOverride);
    if (newOverride) {
      overrideAll(effectiveCategory);
    }
  }, [manualOverride, effectiveCategory]);

  // --- Refs ---
  const controllerRef = useRef<ExerciseController | null>(null);
  const captureEngineRef = useRef<ReturnType<typeof createKeyCaptureEngine> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reservedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeyStateRef = useRef<KeyState | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      captureEngineRef.current?.disable();
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (reservedTimerRef.current) clearTimeout(reservedTimerRef.current);
    };
  }, []);

  /**
   * Reset inactivity timer — pulses keyboard after 10 seconds of no input.
   */
  const resetInactivityTimer = useCallback(() => {
    setInactive(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      setInactive(true);
    }, 10000);
  }, []);

  /**
   * Show OS-reserved notification for 3 seconds (Req 1.4).
   */
  const showReservedNotice = useCallback((combination: KeyCombination) => {
    const formatted = formatKeyCombination(combination);
    setReservedNotice(`${formatted} is reserved by macOS and unavailable for practice`);
    if (reservedTimerRef.current) clearTimeout(reservedTimerRef.current);
    reservedTimerRef.current = setTimeout(() => {
      setReservedNotice(null);
    }, 3000);
  }, []);

  /**
   * Start the exercise with selected configuration.
   */
  const startExercise = useCallback(() => {
    // Get prompts based on category selection
    let prompts: KeyCombination[];
    let skippedReserved: KeyCombination[];
    const category: KeyCategory = selectedCategory === 'mixed' ? 'combinations' : selectedCategory;

    if (selectedCategory === 'mixed') {
      const result = getMixedPrompts(promptCount);
      prompts = result.prompts;
      skippedReserved = result.skippedReserved;
    } else {
      // Use difficulty-manager level-based prompts for the selected category
      const levelPrompts = getPromptsForLevel(selectedCategory, selectedLevel);
      if (levelPrompts.length > 0) {
        // Filter out OS-reserved combinations
        const filtered = levelPrompts.filter(p => !isOsReserved(p));
        skippedReserved = levelPrompts.filter(p => isOsReserved(p));
        // Shuffle and take promptCount
        const shuffled = [...filtered].sort(() => Math.random() - 0.5);
        prompts = shuffled.slice(0, promptCount);
        // If not enough prompts, repeat from pool
        while (prompts.length < promptCount && filtered.length > 0) {
          const extra = [...filtered].sort(() => Math.random() - 0.5);
          prompts = [...prompts, ...extra].slice(0, promptCount);
        }
      } else {
        // Fallback to category-based prompts if level has no prompts
        const result = getPromptsForCategory(selectedCategory, promptCount);
        prompts = result.prompts;
        skippedReserved = result.skippedReserved;
      }
    }

    // Show notification for OS-reserved combinations that were skipped (Req 8.3)
    if (skippedReserved.length > 0) {
      showReservedNotice(skippedReserved[0]);
    }

    if (prompts.length === 0) {
      return; // No prompts available
    }

    // Create controller and start exercise
    const controller = new ExerciseController();
    controllerRef.current = controller;

    controller.start({
      category,
      promptCount,
      prompts,
    });

    const state = controller.getState();
    setCurrentPrompt(state.currentPrompt);
    setCurrentIndex(state.currentPromptIndex);
    setTotalPrompts(state.totalPrompts);
    exerciseCategoryRef.current = category;
    setFeedback(null);
    setPressedKeys(null);
    setMode('active');

    // Create and enable key capture engine
    const engine = createKeyCaptureEngine();
    captureEngineRef.current = engine;
    engine.enable(true);

    // Subscribe to key combinations
    engine.onKeyCombination((keyState: KeyState) => {
      lastKeyStateRef.current = keyState;
      setHeldKeys(getHeldKeyCodes(keyState));
      resetInactivityTimer();

      const ctrl = controllerRef.current;
      if (!ctrl) return;

      const prevState = ctrl.getState();
      if (prevState.status !== 'active') return;

      // Check if the current prompt is OS-reserved (shouldn't happen since we filter,
      // but guard against custom sets)
      if (isOsReserved(prevState.currentPrompt)) {
        showReservedNotice(prevState.currentPrompt);
        return;
      }

      ctrl.handleInput(keyState);
      const newState = ctrl.getState();

      if (newState.status === 'complete') {
        // Exercise completed
        const results = newState.results;
        const correctCount = results.filter(r => r.correct).length;
        const totalAtt = results.reduce((sum, r) => sum + r.attempts, 0);
        const acc = results.length > 0 ? correctCount / results.length : 0;
        const avgTime = results.length > 0
          ? results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length
          : 0;

        setAccuracy(acc);
        setAvgResponseTime(avgTime);
        setTotalAttempts(totalAtt);
        setFeedback('correct');
        setMode('complete');

        // Disable capture engine
        engine.disable();
        captureEngineRef.current = null;

        // Save session to progress tracker (Req 5.1)
        const perCombinationData: CombinationStat[] = results.map(r => ({
          combination: r.prompt,
          attempts: r.attempts,
          correctCount: r.correct ? 1 : 0,
          avgResponseTimeMs: r.responseTimeMs,
        }));

        const sessionRecord: SessionRecord = {
          id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          date: new Date().toISOString(),
          category: exerciseCategoryRef.current,
          accuracy: acc,
          avgResponseTimeMs: avgTime,
          promptCount: results.length,
          perCombinationData,
        };

        saveSession(sessionRecord);
      } else if (newState.currentPromptIndex > prevState.currentPromptIndex) {
        // Correct answer — show success feedback (Req 3.3)
        setFeedback('correct');
        setPressedKeys(null);

        // Clear feedback and show next prompt after delay
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => {
          setFeedback(null);
          const latestState = ctrl.getState();
          if (latestState.status === 'active') {
            setCurrentPrompt(latestState.currentPrompt);
            setCurrentIndex(latestState.currentPromptIndex);
          }
        }, 600);
      } else {
        // Incorrect answer — show error feedback with pressed keys (Req 3.4)
        setFeedback('incorrect');
        setPressedKeys(formatKeyState(keyState));

        // Clear error feedback after a short delay but keep same prompt
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => {
          setFeedback(null);
          setPressedKeys(null);
        }, 1500);
      }
    });

    // Start inactivity timer
    resetInactivityTimer();
  }, [selectedCategory, selectedLevel, promptCount, resetInactivityTimer, showReservedNotice]);

  /**
   * Reset to setup mode.
   */
  const resetExercise = useCallback(() => {
    captureEngineRef.current?.disable();
    captureEngineRef.current = null;
    controllerRef.current = null;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setMode('setup');
    setFeedback(null);
    setPressedKeys(null);
    setHeldKeys([]);
    setInactive(false);
    setCurrentPrompt(null);
    setReservedNotice(null);
  }, []);

  // Highlighted keys for the visual keyboard
  const highlightedKeys = useMemo(() => {
    if (!currentPrompt || mode !== 'active') return [];
    return getHighlightedKeyCodes(currentPrompt);
  }, [currentPrompt, mode]);

  // Handle prompt count slider change
  const handlePromptCountChange = (value: number) => {
    setPromptCount(Math.max(10, Math.min(50, value)));
  };

  // --- RENDER ---

  // Setup Mode
  if (mode === 'setup') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Exercise Mode
        </h1>

        {/* Category Selection */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Select Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSelectedCategory(id)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                  selectedCategory === id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Difficulty Indicator (for non-mixed categories) */}
        {selectedCategory !== 'mixed' && (
          <section className="mb-8">
            <DifficultyIndicator
              category={effectiveCategory}
              currentLevel={selectedLevel}
              progress={categoryProgress}
            />

            {/* Level Selection */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty Level
              </label>
              <div className="space-y-2">
                {([1, 2, 3, 4] as DifficultyLevel[]).map(level => {
                  const isUnlocked = manualOverride || availableLevels.includes(level);
                  const levelLabels: Record<DifficultyLevel, string> = {
                    1: 'Level 1 — Cmd/Shift combos',
                    2: 'Level 2 — Ctrl/Alt combos',
                    3: 'Level 3 — Three-key combos',
                    4: 'Level 4 — Four-key combos',
                  };
                  return (
                    <label
                      key={level}
                      className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                        isUnlocked
                          ? selectedLevel === level
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                          : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="radio"
                        name="exercise-difficulty-level"
                        value={level}
                        checked={selectedLevel === level}
                        disabled={!isUnlocked}
                        onChange={() => setSelectedLevel(level)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${isUnlocked ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'}`}>
                        {levelLabels[level]}
                        {!isUnlocked && ' 🔒'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Manual Override Toggle */}
            <div className="mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualOverride}
                  onChange={handleOverrideToggle}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Override difficulty gating (unlock all levels)
                </span>
              </label>
            </div>
          </section>
        )}

        {/* Prompt Count Configuration */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Number of Prompts
          </h2>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={10}
              max={50}
              value={promptCount}
              onChange={(e) => handlePromptCountChange(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <input
              type="number"
              min={10}
              max={50}
              value={promptCount}
              onChange={(e) => handlePromptCountChange(Number(e.target.value))}
              className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Between 10 and 50 prompts per exercise
          </p>
        </section>

        {/* Start Button */}
        <button
          onClick={startExercise}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-lg"
        >
          Start Exercise
        </button>
      </div>
    );
  }

  // Active Exercise Mode
  if (mode === 'active') {
    const progress = totalPrompts > 0 ? ((currentIndex) / totalPrompts) * 100 : 0;

    return (
      <div className="p-8 max-w-3xl mx-auto">
        {/* OS-reserved notification (Req 1.4) */}
        {reservedNotice && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg text-yellow-800 dark:text-yellow-200 text-sm">
            ⚠️ {reservedNotice}
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentIndex + 1} / {totalPrompts}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Prompt Display */}
        <div className="mb-8">
          <PromptDisplay
            currentPrompt={currentPrompt}
            feedback={feedback}
            pressedKeys={pressedKeys}
          />
        </div>

        {/* Visual Keyboard */}
        <div className="mb-6">
          <VisualKeyboard
            highlightedKeys={highlightedKeys}
            heldKeys={heldKeys}
            inactive={inactive}
          />
        </div>

        {/* Cancel button */}
        <div className="text-center">
          <button
            onClick={resetExercise}
            className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Cancel Exercise
          </button>
        </div>
      </div>
    );
  }

  // Completion Summary
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Exercise Complete! 🎉
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Here's how you did:
        </p>

        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Accuracy */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {Math.round(accuracy * 100)}%
            </div>
            <div className="text-sm text-green-700 dark:text-green-300 mt-1">
              Accuracy
            </div>
          </div>

          {/* Average Response Time */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {avgResponseTime < 1000
                ? `${Math.round(avgResponseTime)}ms`
                : `${(avgResponseTime / 1000).toFixed(1)}s`}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Avg Response Time
            </div>
          </div>
        </div>

        {/* Additional stats */}
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Total attempts: {totalAttempts} | Prompts completed: {totalPrompts}
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={startExercise}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={resetExercise}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors"
          >
            Change Settings
          </button>
        </div>
      </div>
    </div>
  );
}

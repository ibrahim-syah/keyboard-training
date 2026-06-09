import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyCategory, KeyCombination, DrillStats, KeyState, DifficultyLevel, CategoryProgress } from '../domain/types';
import { DrillModeEngine } from '../domain/drill-mode-engine';
import { createKeyCaptureEngine } from '../domain/key-capture-engine';
import { formatKeyCombination } from '../domain/key-display';
import { getAvailableLevels, getPromptsForLevel, getCategoryProgress, overrideAll } from '../domain/difficulty-manager';
import { getAll as getAllCustomSets, getPresets } from '../domain/custom-set-manager';
import { PromptDisplay } from '../components/PromptDisplay';
import type { FeedbackType } from '../components/PromptDisplay';
import { VisualKeyboard } from '../components/VisualKeyboard';
import { DifficultyIndicator } from '../components/DifficultyIndicator';
import { ReservedNotification } from '../components/ReservedNotification';
import { useReservedSkip } from '../hooks/useReservedSkip';

/** Categories available for selection */
const CATEGORIES: { value: KeyCategory; label: string }[] = [
  { value: 'modifiers', label: 'Modifier Keys' },
  { value: 'numbers', label: 'Number Keys' },
  { value: 'function-keys', label: 'Function Keys' },
  { value: 'navigation', label: 'Navigation Keys' },
  { value: 'combinations', label: 'Combinations' },
];

type DrillPageState = 'setup' | 'active' | 'summary';

/**
 * DrillPage implements the drill mode training interface with three states:
 * - Setup: category/custom-set selection, difficulty level, override toggle
 * - Active: PromptDisplay + VisualKeyboard + live stats + double-Escape exit
 * - Summary: accuracy, avg response time, top 3 most-missed combinations
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.3, 7.4, 7.5
 */
export default function DrillPage() {
  const [pageState, setPageState] = useState<DrillPageState>('setup');

  // Setup state
  const [selectedCategory, setSelectedCategory] = useState<KeyCategory>('combinations');
  const [selectedCustomSetId, setSelectedCustomSetId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>(1);
  const [manualOverride, setManualOverride] = useState(false);
  const [allReservedMessage, setAllReservedMessage] = useState<string | null>(null);

  // OS-reserved skip handling
  const {
    notificationCombo,
    notificationVisible,
    notificationDuration,
    filterPrompts,
    dismissNotification,
  } = useReservedSkip();

  // Active drill state
  const [currentPrompt, setCurrentPrompt] = useState<KeyCombination | null>(null);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [pressedKeys, setPressedKeys] = useState<string | null>(null);
  const [heldKeys, setHeldKeys] = useState<string[]>([]);
  const [inactive, setInactive] = useState(false);
  const [liveAccuracy, setLiveAccuracy] = useState(0);
  const [liveAvgTime, setLiveAvgTime] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [escapeHint, setEscapeHint] = useState(false);

  // Summary state
  const [drillStats, setDrillStats] = useState<DrillStats | null>(null);

  // Refs for engine instances
  const drillEngineRef = useRef<DrillModeEngine | null>(null);
  const keyCaptureRef = useRef<ReturnType<typeof createKeyCaptureEngine> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const escapeHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get available custom sets + presets
  const customSets = useMemo(() => [...getPresets(), ...getAllCustomSets()], []);

  // Get available levels for the selected category
  const availableLevels = useMemo((): DifficultyLevel[] => {
    if (manualOverride) return [1, 2, 3, 4];
    return getAvailableLevels(selectedCategory);
  }, [selectedCategory, manualOverride]);

  // Get category progress for the difficulty indicator
  const categoryProgress = useMemo(() => getCategoryProgress(selectedCategory), [selectedCategory]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    setInactive(false);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setInactive(true);
    }, 10000);
  }, []);

  // Get highlighted keys from a combination
  const getHighlightedKeys = useCallback((combo: KeyCombination | null): string[] => {
    if (!combo) return [];
    const keys: string[] = [];
    if (combo.modifiers.ctrl) keys.push('ControlLeft');
    if (combo.modifiers.alt) keys.push('AltLeft');
    if (combo.modifiers.shift) keys.push('ShiftLeft');
    if (combo.modifiers.meta) keys.push('MetaLeft');
    keys.push(combo.baseKey);
    return keys;
  }, []);

  // Get held key codes from KeyState
  const getHeldKeyCodes = useCallback((state: KeyState): string[] => {
    const codes: string[] = [];
    if (state.modifiers.ctrlLeft) codes.push('ControlLeft');
    if (state.modifiers.ctrlRight) codes.push('ControlRight');
    if (state.modifiers.altLeft) codes.push('AltLeft');
    if (state.modifiers.altRight) codes.push('AltRight');
    if (state.modifiers.shiftLeft) codes.push('ShiftLeft');
    if (state.modifiers.shiftRight) codes.push('ShiftRight');
    if (state.modifiers.metaLeft) codes.push('MetaLeft');
    if (state.modifiers.metaRight) codes.push('MetaRight');
    if (state.baseKey) codes.push(state.baseKey);
    return codes;
  }, []);

  // Start drill session
  const startDrill = useCallback(() => {
    const engine = new DrillModeEngine();
    drillEngineRef.current = engine;

    // Reset live tracking refs
    correctCountRef.current = 0;
    totalTimeRef.current = 0;
    attemptCountRef.current = 0;
    promptStartRef.current = Date.now();

    // Determine prompt pool
    let customSet: KeyCombination[] | undefined;
    if (selectedCustomSetId) {
      const found = customSets.find(s => s.id === selectedCustomSetId);
      if (found) {
        customSet = found.combinations;
      }
    } else {
      // Use level-based prompts
      customSet = getPromptsForLevel(selectedCategory, selectedLevel);
    }

    // Filter out OS-reserved combinations and check edge case (Req 8.3)
    if (customSet && customSet.length > 0) {
      const { availablePrompts, allReserved } = filterPrompts(customSet);
      if (allReserved) {
        // All prompts are OS-reserved — end drill with message
        setAllReservedMessage('All combinations in this set are reserved by macOS');
        drillEngineRef.current = null;
        return;
      }
      customSet = availablePrompts;
    }

    engine.start({
      category: selectedCategory,
      customSet,
    });

    // Set up escape sequence handler
    engine.onEscapeSequence(() => {
      const stats = engine.stop();
      setDrillStats(stats);
      setPageState('summary');

      // Clean up capture engine
      if (keyCaptureRef.current) {
        keyCaptureRef.current.disable();
        keyCaptureRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    });

    // Set up key capture engine
    const capture = createKeyCaptureEngine();
    keyCaptureRef.current = capture;
    capture.enable(true);

    // Handle keyboard input
    capture.onKeyCombination((state: KeyState) => {
      if (!drillEngineRef.current || !drillEngineRef.current.isActive()) return;

      resetInactivityTimer();
      setHeldKeys(getHeldKeyCodes(state));

      // Check for single escape (show hint)
      if (state.baseKey === 'Escape') {
        setEscapeHint(true);
        if (escapeHintTimerRef.current) {
          clearTimeout(escapeHintTimerRef.current);
        }
        escapeHintTimerRef.current = setTimeout(() => {
          setEscapeHint(false);
        }, 1500);
      }

      const previousPrompt = drillEngineRef.current.getCurrentPrompt();
      drillEngineRef.current.handleInput(state);

      // Track live stats for non-Escape inputs
      if (previousPrompt && state.baseKey !== 'Escape') {
        const isCorrect = isMatchingInput(previousPrompt, state);
        const responseTime = Date.now() - promptStartRef.current;

        attemptCountRef.current += 1;
        totalTimeRef.current += responseTime;
        if (isCorrect) {
          correctCountRef.current += 1;
        }

        // Update live stats state
        const newAccuracy = correctCountRef.current / attemptCountRef.current;
        const newAvgTime = totalTimeRef.current / attemptCountRef.current;
        setLiveAccuracy(newAccuracy);
        setLiveAvgTime(newAvgTime);
        setTotalAttempts(attemptCountRef.current);

        // Show feedback
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        if (!isCorrect) {
          setPressedKeys(formatKeyState(state));
        } else {
          setPressedKeys(null);
        }
        // Clear feedback after brief delay
        setTimeout(() => {
          setFeedback(null);
          setPressedKeys(null);
        }, 600);
      }

      // Update current prompt from engine and reset prompt start time
      if (drillEngineRef.current.isActive()) {
        const nextPrompt = drillEngineRef.current.getCurrentPrompt();
        setCurrentPrompt(nextPrompt);
        promptStartRef.current = Date.now();
      }
    });

    // Initialize state
    setCurrentPrompt(engine.getCurrentPrompt());
    setFeedback(null);
    setPressedKeys(null);
    setHeldKeys([]);
    setInactive(false);
    setLiveAccuracy(0);
    setLiveAvgTime(0);
    setTotalAttempts(0);
    setEscapeHint(false);
    setPageState('active');
    promptStartRef.current = Date.now();
    resetInactivityTimer();
  }, [selectedCategory, selectedCustomSetId, selectedLevel, customSets, resetInactivityTimer, getHeldKeyCodes]);

  // Live stats tracking
  const correctCountRef = useRef(0);
  const totalTimeRef = useRef(0);
  const attemptCountRef = useRef(0);
  const promptStartRef = useRef(Date.now());

  // Restart drill - go back to setup
  const restartDrill = useCallback(() => {
    setDrillStats(null);
    setAllReservedMessage(null);
    setPageState('setup');
    correctCountRef.current = 0;
    totalTimeRef.current = 0;
    attemptCountRef.current = 0;
  }, []);

  // Handle manual override toggle
  const handleOverrideToggle = useCallback(() => {
    const newOverride = !manualOverride;
    setManualOverride(newOverride);
    if (newOverride) {
      overrideAll(selectedCategory);
    }
  }, [manualOverride, selectedCategory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (keyCaptureRef.current) {
        keyCaptureRef.current.disable();
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (escapeHintTimerRef.current) {
        clearTimeout(escapeHintTimerRef.current);
      }
    };
  }, []);

  // Render based on state
  if (pageState === 'setup') {
    return (
      <div>
        {/* All-reserved edge case message */}
        {allReservedMessage && (
          <div className="p-8 max-w-xl mx-auto">
            <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-6 text-center">
              <p className="text-amber-800 dark:text-amber-200 font-medium text-lg mb-4">
                {allReservedMessage}
              </p>
              <button
                type="button"
                onClick={() => setAllReservedMessage(null)}
                className="px-4 py-2 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
        {!allReservedMessage && (
          <SetupView
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedCustomSetId={selectedCustomSetId}
            onCustomSetChange={setSelectedCustomSetId}
            selectedLevel={selectedLevel}
            onLevelChange={setSelectedLevel}
            availableLevels={availableLevels}
            manualOverride={manualOverride}
            onOverrideToggle={handleOverrideToggle}
            customSets={customSets}
            categoryProgress={categoryProgress}
            onStart={startDrill}
          />
        )}
      </div>
    );
  }

  if (pageState === 'summary' && drillStats) {
    return (
      <DrillSummary stats={drillStats} onRestart={restartDrill} />
    );
  }

  // Active state
  return (
    <div>
      {/* Reserved combination notification during active drill */}
      <div className="flex justify-center mb-2">
        <ReservedNotification
          combination={notificationCombo}
          visible={notificationVisible}
          durationMs={notificationDuration}
          onDismiss={dismissNotification}
        />
      </div>
      <ActiveDrillView
        currentPrompt={currentPrompt}
        feedback={feedback}
        pressedKeys={pressedKeys}
        heldKeys={heldKeys}
        inactive={inactive}
        highlightedKeys={getHighlightedKeys(currentPrompt)}
        liveAccuracy={liveAccuracy}
        liveAvgTime={liveAvgTime}
        totalAttempts={totalAttempts}
        escapeHint={escapeHint}
      />
    </div>
  );
}

// --- Helper functions ---

/** Simple key state matcher (mirrors key-matcher logic) */
function isMatchingInput(expected: KeyCombination, actual: KeyState): boolean {
  const mods = actual.modifiers;
  const hasCtrl = mods.ctrlLeft || mods.ctrlRight;
  const hasAlt = mods.altLeft || mods.altRight;
  const hasShift = mods.shiftLeft || mods.shiftRight;
  const hasMeta = mods.metaLeft || mods.metaRight;

  return (
    expected.modifiers.ctrl === hasCtrl &&
    expected.modifiers.alt === hasAlt &&
    expected.modifiers.shift === hasShift &&
    expected.modifiers.meta === hasMeta &&
    expected.baseKey === actual.baseKey
  );
}

/** Format a KeyState into readable macOS symbol string */
function formatKeyState(state: KeyState): string {
  const parts: string[] = [];
  const mods = state.modifiers;
  if (mods.ctrlLeft || mods.ctrlRight) parts.push('⌃');
  if (mods.altLeft || mods.altRight) parts.push('⌥');
  if (mods.shiftLeft || mods.shiftRight) parts.push('⇧');
  if (mods.metaLeft || mods.metaRight) parts.push('⌘');
  if (state.baseKey) {
    // Simple mapping for display
    const keyName = state.baseKey.replace(/^Key/, '').replace(/^Digit/, '');
    parts.push(keyName);
  }
  return parts.join('');
}

// --- Sub-components ---

interface SetupViewProps {
  selectedCategory: KeyCategory;
  onCategoryChange: (cat: KeyCategory) => void;
  selectedCustomSetId: string | null;
  onCustomSetChange: (id: string | null) => void;
  selectedLevel: DifficultyLevel;
  onLevelChange: (level: DifficultyLevel) => void;
  availableLevels: DifficultyLevel[];
  manualOverride: boolean;
  onOverrideToggle: () => void;
  customSets: Array<{ id: string; name: string; combinations: KeyCombination[] }>;
  categoryProgress: CategoryProgress;
  onStart: () => void;
}

function SetupView({
  selectedCategory,
  onCategoryChange,
  selectedCustomSetId,
  onCustomSetChange,
  selectedLevel,
  onLevelChange,
  availableLevels,
  manualOverride,
  onOverrideToggle,
  customSets,
  categoryProgress,
  onStart,
}: SetupViewProps) {
  const allLevels: DifficultyLevel[] = [1, 2, 3, 4];
  const levelLabels: Record<DifficultyLevel, string> = {
    1: 'Level 1 — Cmd/Shift combos',
    2: 'Level 2 — Ctrl/Alt combos',
    3: 'Level 3 — Three-key combos',
    4: 'Level 4 — Four-key combos',
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Drill Mode
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Practice key combinations with adaptive repetition. Missed combinations appear more frequently to build muscle memory.
      </p>

      {/* Category Selection */}
      <div className="mb-6">
        <label htmlFor="drill-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Category
        </label>
        <select
          id="drill-category"
          value={selectedCategory}
          onChange={(e) => {
            onCategoryChange(e.target.value as KeyCategory);
            onCustomSetChange(null);
          }}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom Set Selection */}
      {customSets.length > 0 && (
        <div className="mb-6">
          <label htmlFor="drill-custom-set" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Custom / Preset Set (optional)
          </label>
          <select
            id="drill-custom-set"
            value={selectedCustomSetId ?? ''}
            onChange={(e) => onCustomSetChange(e.target.value || null)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Use category prompts</option>
            {customSets.map(set => (
              <option key={set.id} value={set.id}>
                {set.name} ({set.combinations.length} combos)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Difficulty Indicator */}
      {!selectedCustomSetId && (
        <div className="mb-6">
          <DifficultyIndicator
            category={selectedCategory}
            currentLevel={selectedLevel}
            progress={categoryProgress}
          />
        </div>
      )}

      {/* Difficulty Level Selection */}
      {!selectedCustomSetId && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Difficulty Level
          </label>
          <div className="space-y-2">
            {allLevels.map(level => {
              const isUnlocked = manualOverride || availableLevels.includes(level);
              return (
                <label
                  key={level}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                    isUnlocked
                      ? selectedLevel === level
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <input
                    type="radio"
                    name="difficulty-level"
                    value={level}
                    checked={selectedLevel === level}
                    disabled={!isUnlocked}
                    onChange={() => onLevelChange(level)}
                    className="text-indigo-600 focus:ring-indigo-500"
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
      )}

      {/* Manual Override Toggle */}
      <div className="mb-8">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={manualOverride}
            onChange={onOverrideToggle}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Override difficulty gating (unlock all levels)
          </span>
        </label>
      </div>

      {/* Start Button */}
      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-md bg-indigo-600 px-4 py-3 text-white font-medium shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
      >
        Start Drill
      </button>
    </div>
  );
}

interface ActiveDrillViewProps {
  currentPrompt: KeyCombination | null;
  feedback: FeedbackType;
  pressedKeys: string | null;
  heldKeys: string[];
  inactive: boolean;
  highlightedKeys: string[];
  liveAccuracy: number;
  liveAvgTime: number;
  totalAttempts: number;
  escapeHint: boolean;
}

function ActiveDrillView({
  currentPrompt,
  feedback,
  pressedKeys,
  heldKeys,
  inactive,
  highlightedKeys,
  liveAccuracy,
  liveAvgTime,
  totalAttempts,
  escapeHint,
}: ActiveDrillViewProps) {
  return (
    <div className="p-8 flex flex-col items-center gap-6">
      {/* Live Stats Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Accuracy</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {totalAttempts > 0 ? `${Math.round(liveAccuracy * 100)}%` : '—'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Avg Time</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {totalAttempts > 0 ? `${Math.round(liveAvgTime)}ms` : '—'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Attempts</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {totalAttempts}
          </div>
        </div>
      </div>

      {/* Prompt Display */}
      <div className="w-full max-w-2xl">
        <PromptDisplay
          currentPrompt={currentPrompt}
          feedback={feedback}
          pressedKeys={pressedKeys}
        />
      </div>

      {/* Visual Keyboard */}
      <div className="w-full max-w-3xl">
        <VisualKeyboard
          highlightedKeys={highlightedKeys}
          heldKeys={heldKeys}
          inactive={inactive}
        />
      </div>

      {/* Exit hint */}
      <div className={`text-sm transition-colors duration-200 ${
        escapeHint
          ? 'text-amber-600 dark:text-amber-400 font-medium'
          : 'text-gray-400 dark:text-gray-500'
      }`}>
        {escapeHint
          ? 'Press Escape again quickly to exit'
          : 'Press Esc twice to exit drill'}
      </div>
    </div>
  );
}

interface DrillSummaryProps {
  stats: DrillStats;
  onRestart: () => void;
}

function DrillSummary({ stats, onRestart }: DrillSummaryProps) {
  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Drill Complete
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Here's how you did in this session.
      </p>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Accuracy</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {Math.round(stats.accuracy * 100)}%
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Response Time</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {Math.round(stats.avgResponseTimeMs)}ms
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center col-span-2">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Attempts</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.totalAttempts}
          </div>
        </div>
      </div>

      {/* Most Missed */}
      {stats.mostMissed.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Most Missed Combinations
          </h2>
          <div className="space-y-2">
            {stats.mostMissed.map((combo, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3"
              >
                <span className="text-red-500 dark:text-red-400 font-medium text-sm">
                  #{index + 1}
                </span>
                <span className="text-lg font-mono text-gray-900 dark:text-gray-100">
                  {formatKeyCombination(combo)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 rounded-md bg-indigo-600 px-4 py-3 text-white font-medium shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          New Drill
        </button>
      </div>
    </div>
  );
}

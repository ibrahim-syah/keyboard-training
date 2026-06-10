import { useState, useEffect, useRef, useCallback } from 'react';
import type { KeyCombination, KeyState } from '../domain/types';
import {
  loadOverrides,
  saveOverrides,
  clearOverrides,
  addCombination,
  removeCombination,
  getEffectiveList,
} from '../domain/reserved-list-manager';
import type { UserOverrides } from '../domain/reserved-list-manager';
import {
  DEFAULT_RESERVED_COMBINATIONS,
  OS_RESERVED,
  BROWSER_RESERVED,
} from '../data/default-reserved';
import { createKeyCaptureEngine } from '../domain/key-capture-engine';
import type { KeyCaptureEngine } from '../domain/key-capture-engine';
import { formatKeyCombination } from '../domain/key-display';

/**
 * Converts a KeyState (with left/right modifier distinction) to a KeyCombination.
 */
function keyStateToCombination(state: KeyState): KeyCombination | null {
  if (!state.baseKey) return null;
  return {
    modifiers: {
      ctrl: state.modifiers.ctrlLeft || state.modifiers.ctrlRight,
      alt: state.modifiers.altLeft || state.modifiers.altRight,
      shift: state.modifiers.shiftLeft || state.modifiers.shiftRight,
      meta: state.modifiers.metaLeft || state.modifiers.metaRight,
    },
    baseKey: state.baseKey,
  };
}

/**
 * Checks whether two KeyCombinations are equal.
 */
function combinationsEqual(a: KeyCombination, b: KeyCombination): boolean {
  return (
    a.baseKey === b.baseKey &&
    a.modifiers.ctrl === b.modifiers.ctrl &&
    a.modifiers.alt === b.modifiers.alt &&
    a.modifiers.shift === b.modifiers.shift &&
    a.modifiers.meta === b.modifiers.meta
  );
}

type ComboSource = 'os' | 'browser' | 'user';

interface GroupedCombo {
  combo: KeyCombination;
  source: ComboSource;
}

/**
 * Groups the effective reserved list by source: OS, Browser, or User-added.
 */
function groupBySource(
  effectiveList: KeyCombination[],
  overrides: UserOverrides,
): GroupedCombo[] {
  return effectiveList.map((combo) => {
    // Check if it's a user addition
    const isUserAdded = overrides.additions.some((a) => combinationsEqual(a, combo));
    if (isUserAdded) {
      return { combo, source: 'user' };
    }
    // Check if it's an OS default
    const isOs = OS_RESERVED.some((os) => combinationsEqual(os, combo));
    if (isOs) {
      return { combo, source: 'os' };
    }
    // Check if it's a Browser default
    const isBrowser = BROWSER_RESERVED.some((br) => combinationsEqual(br, combo));
    if (isBrowser) {
      return { combo, source: 'browser' };
    }
    // Fallback (shouldn't happen, but treat as user-added)
    return { combo, source: 'user' };
  });
}

function SourceBadge({ source }: { source: ComboSource }) {
  const styles: Record<ComboSource, string> = {
    os: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    browser: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    user: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  };
  const labels: Record<ComboSource, string> = {
    os: 'OS',
    browser: 'Browser',
    user: 'User',
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[source]}`}>
      {labels[source]}
    </span>
  );
}

function getInitialOverrides(): UserOverrides {
  return loadOverrides();
}

function getInitialEffectiveList(): KeyCombination[] {
  return getEffectiveList(DEFAULT_RESERVED_COMBINATIONS, getInitialOverrides());
}

export default function ReservedSettingsPage() {
  const [overrides, setOverrides] = useState<UserOverrides>(getInitialOverrides);
  const [effectiveList, setEffectiveList] = useState<KeyCombination[]>(getInitialEffectiveList);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedCombo, setCapturedCombo] = useState<KeyCombination | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const engineRef = useRef<KeyCaptureEngine | null>(null);

  // Key capture engine for add form
  const handleCombinationCaptured = useCallback((state: KeyState) => {
    const combo = keyStateToCombination(state);
    if (!combo) return;
    setCapturedCombo(combo);
    setDuplicateNotice(false);
  }, []);

  useEffect(() => {
    if (isRecording) {
      const engine = createKeyCaptureEngine();
      engineRef.current = engine;
      engine.enable(true);
      const unsubscribe = engine.onKeyCombination(handleCombinationCaptured);
      return () => {
        unsubscribe();
        engine.disable();
        engineRef.current = null;
      };
    } else {
      if (engineRef.current) {
        engineRef.current.disable();
        engineRef.current = null;
      }
    }
  }, [isRecording, handleCombinationCaptured]);

  // Helper to update state and recompute effective list
  const applyOverrides = useCallback((newOverrides: UserOverrides) => {
    setOverrides(newOverrides);
    setEffectiveList(getEffectiveList(DEFAULT_RESERVED_COMBINATIONS, newOverrides));
  }, []);

  // Add combination handler
  const handleAdd = () => {
    if (!capturedCombo) return;

    const newOverrides = addCombination(overrides, capturedCombo, DEFAULT_RESERVED_COMBINATIONS);

    // If overrides didn't change, it's a duplicate
    if (newOverrides === overrides) {
      setDuplicateNotice(true);
      return;
    }

    saveOverrides(newOverrides);
    applyOverrides(newOverrides);
    setCapturedCombo(null);
    setDuplicateNotice(false);
    setIsRecording(false);
  };

  // Remove combination handler
  const handleRemove = (combo: KeyCombination) => {
    const newOverrides = removeCombination(overrides, combo, DEFAULT_RESERVED_COMBINATIONS);
    saveOverrides(newOverrides);
    applyOverrides(newOverrides);
  };

  // Reset to defaults handler
  const handleReset = () => {
    clearOverrides();
    const emptyOverrides: UserOverrides = { additions: [], removals: [] };
    applyOverrides(emptyOverrides);
    setShowResetConfirm(false);
  };

  // Group the effective list
  const grouped = groupBySource(effectiveList, overrides);
  const osItems = grouped.filter((g) => g.source === 'os');
  const browserItems = grouped.filter((g) => g.source === 'browser');
  const userItems = grouped.filter((g) => g.source === 'user');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Reserved Combinations
      </h1>

      {/* Count summary */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {effectiveList.length} total reserved combinations
        {' '}({osItems.length} OS, {browserItems.length} Browser, {userItems.length} User-added)
      </p>

      {/* Add Combination Section */}
      <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Add Combination
        </h2>

        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => {
              setIsRecording(!isRecording);
              setCapturedCombo(null);
              setDuplicateNotice(false);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              isRecording
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          {isRecording && (
            <span className="text-sm text-green-600 dark:text-green-400 animate-pulse">
              ● Recording — press a key combination...
            </span>
          )}
        </div>

        {/* Captured combo preview */}
        {capturedCombo && (
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded font-mono text-sm text-gray-800 dark:text-gray-200">
              {formatKeyCombination(capturedCombo)}
            </span>
            <button
              type="button"
              onClick={handleAdd}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
            >
              Add to Reserved
            </button>
          </div>
        )}

        {/* Duplicate notice */}
        {duplicateNotice && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            This combination is already in the reserved list.
          </p>
        )}
      </section>

      {/* Reset to Defaults */}
      <section className="mb-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Reset to Defaults
          </button>
        </div>

        {showResetConfirm && (
          <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
              Are you sure? This will remove all custom additions and restore any removed defaults.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Effective Reserved List grouped by source */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Reserved List
        </h2>

        {/* OS Reserved */}
        {osItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              OS Reserved ({osItems.length})
            </h3>
            <div className="grid gap-2">
              {osItems.map((item, index) => (
                <div
                  key={`os-${index}`}
                  className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {formatKeyCombination(item.combo)}
                    </span>
                    <SourceBadge source={item.source} />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.combo)}
                    className="px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    aria-label={`Remove ${formatKeyCombination(item.combo)}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browser Reserved */}
        {browserItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Browser Reserved ({browserItems.length})
            </h3>
            <div className="grid gap-2">
              {browserItems.map((item, index) => (
                <div
                  key={`browser-${index}`}
                  className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {formatKeyCombination(item.combo)}
                    </span>
                    <SourceBadge source={item.source} />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.combo)}
                    className="px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    aria-label={`Remove ${formatKeyCombination(item.combo)}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User-Added */}
        {userItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              User-Added ({userItems.length})
            </h3>
            <div className="grid gap-2">
              {userItems.map((item, index) => (
                <div
                  key={`user-${index}`}
                  className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {formatKeyCombination(item.combo)}
                    </span>
                    <SourceBadge source={item.source} />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.combo)}
                    className="px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    aria-label={`Remove ${formatKeyCombination(item.combo)}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {effectiveList.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 italic">
            No reserved combinations. All shortcuts are available for training.
          </p>
        )}
      </section>
    </div>
  );
}

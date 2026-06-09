import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeyCombination } from '../domain/types';
import { isOsReserved } from '../data/os-reserved';

/**
 * Result of filtering a prompt list against OS-reserved combinations.
 */
export interface ReservedSkipResult {
  /** Non-reserved prompts that can be presented to the user */
  availablePrompts: KeyCombination[];
  /** Prompts that were filtered out because they are OS-reserved */
  skippedPrompts: KeyCombination[];
  /** Whether all prompts in the original list are OS-reserved */
  allReserved: boolean;
}

/**
 * State returned by the useReservedSkip hook.
 */
export interface UseReservedSkipState {
  /** The current combination being shown in the skip notification, or null */
  notificationCombo: KeyCombination | null;
  /** Whether the notification is currently visible */
  notificationVisible: boolean;
  /** Filter a prompt list, separating available from reserved prompts */
  filterPrompts: (prompts: KeyCombination[]) => ReservedSkipResult;
  /** Trigger a skip notification with auto-advance timer (2s default) */
  triggerSkipNotification: (combination: KeyCombination, onAdvance?: () => void) => void;
  /** Trigger a user-press notification (3s auto-dismiss) */
  triggerUserPressNotification: (combination: KeyCombination) => void;
  /** Dismiss the current notification manually */
  dismissNotification: () => void;
  /** Duration in ms for the current notification (2000 for skip, 3000 for user press) */
  notificationDuration: number;
}

/**
 * useReservedSkip provides utilities for handling OS-reserved key combinations
 * in exercises and drills:
 *
 * - Filters prompt lists to remove OS-reserved combinations
 * - Shows skip notifications when reserved prompts are encountered (2s auto-advance)
 * - Shows user-press notifications when OS-intercepted combos are detected (3s auto-dismiss)
 * - Detects when all prompts are reserved (edge case: end drill with message)
 *
 * Requirements: 1.4, 8.2, 8.3
 */
export function useReservedSkip(): UseReservedSkipState {
  const [notificationCombo, setNotificationCombo] = useState<KeyCombination | null>(null);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationDuration, setNotificationDuration] = useState(2000);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Filter a prompt list into available (non-reserved) and skipped (reserved) prompts.
   * Also reports whether all prompts are reserved.
   */
  const filterPrompts = useMemo(() => {
    return (prompts: KeyCombination[]): ReservedSkipResult => {
      const availablePrompts: KeyCombination[] = [];
      const skippedPrompts: KeyCombination[] = [];

      for (const prompt of prompts) {
        if (isOsReserved(prompt)) {
          skippedPrompts.push(prompt);
        } else {
          availablePrompts.push(prompt);
        }
      }

      return {
        availablePrompts,
        skippedPrompts,
        allReserved: prompts.length > 0 && availablePrompts.length === 0,
      };
    };
  }, []);

  /**
   * Clear any active notification timer.
   */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Trigger a skip notification when the exercise/drill encounters an OS-reserved
   * combination in the prompt list. Shows inline notice for 2 seconds then
   * auto-advances via the onAdvance callback.
   */
  const triggerSkipNotification = useCallback((combination: KeyCombination, onAdvance?: () => void) => {
    clearTimer();
    setNotificationCombo(combination);
    setNotificationVisible(true);
    setNotificationDuration(2000);

    timerRef.current = setTimeout(() => {
      setNotificationVisible(false);
      setNotificationCombo(null);
      onAdvance?.();
    }, 2000);
  }, [clearTimer]);

  /**
   * Trigger a user-press notification when the user presses an OS-intercepted
   * combination (detected by not receiving expected event). Shows notification
   * for 3 seconds then auto-dismisses.
   */
  const triggerUserPressNotification = useCallback((combination: KeyCombination) => {
    clearTimer();
    setNotificationCombo(combination);
    setNotificationVisible(true);
    setNotificationDuration(3000);

    timerRef.current = setTimeout(() => {
      setNotificationVisible(false);
      setNotificationCombo(null);
    }, 3000);
  }, [clearTimer]);

  /**
   * Manually dismiss the current notification.
   */
  const dismissNotification = useCallback(() => {
    clearTimer();
    setNotificationVisible(false);
    setNotificationCombo(null);
  }, [clearTimer]);

  return {
    notificationCombo,
    notificationVisible,
    filterPrompts,
    triggerSkipNotification,
    triggerUserPressNotification,
    dismissNotification,
    notificationDuration,
  };
}

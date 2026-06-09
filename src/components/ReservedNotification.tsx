import { useEffect, useRef, useState } from 'react';
import type { KeyCombination } from '../domain/types';
import { formatKeyCombination } from '../domain/key-display';

/**
 * Props for the ReservedNotification component.
 */
export interface ReservedNotificationProps {
  /** The OS-reserved combination to display, or null if no notification is active */
  combination: KeyCombination | null;
  /** Whether the notification is currently visible */
  visible: boolean;
  /** Auto-dismiss duration in milliseconds (default: 2000 for skip, 3000 for user press) */
  durationMs?: number;
  /** Callback when notification auto-dismisses */
  onDismiss?: () => void;
}

/**
 * ReservedNotification displays an inline amber/yellow notice indicating that
 * a key combination is reserved by macOS and cannot be practiced.
 *
 * Supports two use cases:
 * - Skip notification (2s): When an exercise/drill skips an OS-reserved prompt
 * - User press notification (3s): When the user presses an OS-intercepted combo
 *
 * Requirements: 1.4, 8.2, 8.3
 */
export function ReservedNotification({
  combination,
  visible,
  durationMs = 2000,
  onDismiss,
}: ReservedNotificationProps) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible && combination) {
      setShow(true);

      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Set auto-dismiss timer
      timerRef.current = setTimeout(() => {
        setShow(false);
        onDismiss?.();
      }, durationMs);
    } else {
      setShow(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible, combination, durationMs, onDismiss]);

  if (!show || !combination) {
    return null;
  }

  const formatted = formatKeyCombination(combination);

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-sm font-medium"
    >
      <span className="text-amber-500 dark:text-amber-400" aria-hidden="true">
        ⚠️
      </span>
      <span>
        <span className="font-mono font-semibold">{formatted}</span> is reserved by macOS
      </span>
    </div>
  );
}

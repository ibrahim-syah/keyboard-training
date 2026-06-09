import { useEffect, useState } from 'react';
import type { KeyCombination } from '../domain/types';
import { formatKeyCombination } from '../domain/key-display';

/**
 * Feedback state for the prompt display.
 * - 'correct': user pressed the correct combination
 * - 'incorrect': user pressed the wrong combination
 * - null: no feedback (waiting for input)
 */
export type FeedbackType = 'correct' | 'incorrect' | null;

export interface PromptDisplayProps {
  /** The current key combination prompt to display, or null if no active prompt */
  currentPrompt: KeyCombination | null;
  /** Feedback state after user input */
  feedback: FeedbackType;
  /** Formatted string of what was actually pressed (shown on incorrect input) */
  pressedKeys: string | null;
}

/**
 * PromptDisplay component shows the current key combination prompt
 * using macOS symbols and provides visual feedback for correct/incorrect input.
 *
 * Requirements satisfied:
 * - 3.1: Display Key_Prompt using macOS symbols with minimum 24px font size
 * - 3.2: Modifiers in consistent left-to-right canonical order (handled by formatKeyCombination)
 * - 3.3: Success feedback (green flash/checkmark) within 100ms, next prompt after 500-1000ms delay
 * - 3.4: Error feedback (red flash + pressed keys) within 100ms, same prompt continues
 */
export function PromptDisplay({ currentPrompt, feedback, pressedKeys }: PromptDisplayProps) {
  const [animating, setAnimating] = useState(false);

  // Trigger animation on feedback change
  useEffect(() => {
    if (feedback !== null) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setAnimating(false);
      }, 600);
      return () => clearTimeout(timer);
    }
    setAnimating(false);
  }, [feedback]);

  if (!currentPrompt) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          Waiting for exercise to start...
        </div>
      </div>
    );
  }

  const formattedPrompt = formatKeyCombination(currentPrompt);

  const containerStyle: React.CSSProperties = {
    ...styles.container,
    ...(feedback === 'correct' && animating ? styles.correctFlash : {}),
    ...(feedback === 'incorrect' && animating ? styles.incorrectFlash : {}),
  };

  return (
    <div style={containerStyle} role="status" aria-live="polite" aria-atomic="true">
      {/* Main prompt display */}
      <div style={styles.promptText} aria-label={`Press ${formattedPrompt}`}>
        {formattedPrompt}
      </div>

      {/* Feedback area */}
      <div style={styles.feedbackArea}>
        {feedback === 'correct' && (
          <div style={styles.correctFeedback} aria-label="Correct">
            <span style={styles.checkmark}>✓</span>
            <span style={styles.feedbackLabel}>Correct!</span>
          </div>
        )}

        {feedback === 'incorrect' && (
          <div style={styles.incorrectFeedback} aria-label="Incorrect">
            <span style={styles.crossmark}>✗</span>
            <span style={styles.feedbackLabel}>Incorrect</span>
            {pressedKeys && (
              <div style={styles.pressedKeysDisplay}>
                You pressed: <strong>{pressedKeys}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Styles for the PromptDisplay component.
 * Uses minimum 24px font (text-2xl equivalent) for the prompt as required.
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    transition: 'background-color 100ms ease-in-out, border-color 100ms ease-in-out',
    minHeight: '160px',
    position: 'relative',
  },
  emptyState: {
    fontSize: '18px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  promptText: {
    fontSize: '48px',
    fontWeight: 600,
    letterSpacing: '2px',
    color: '#1f2937',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    userSelect: 'none',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackArea: {
    marginTop: '1rem',
    minHeight: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctFeedback: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#16a34a',
    fontSize: '20px',
    fontWeight: 500,
  },
  incorrectFeedback: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    color: '#dc2626',
    fontSize: '20px',
    fontWeight: 500,
  },
  checkmark: {
    fontSize: '28px',
    fontWeight: 700,
  },
  crossmark: {
    fontSize: '28px',
    fontWeight: 700,
  },
  feedbackLabel: {
    fontSize: '18px',
  },
  pressedKeysDisplay: {
    fontSize: '16px',
    color: '#6b7280',
    marginTop: '4px',
  },
  correctFlash: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  incorrectFlash: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
  },
};

export default PromptDisplay;

import type { DrillConfig, DrillStats, KeyCombination, KeyState } from './types';
import { match } from './key-matcher';
import { getPromptsForCategory } from '../data/key-prompts';

/**
 * Per-combination tracking data used internally by the drill engine.
 */
interface CombinationTrack {
  combination: KeyCombination;
  attempts: number;
  correctCount: number;
  totalResponseTimeMs: number;
}

/**
 * DrillModeEngine provides adaptive drill training with weighted prompt
 * selection based on user performance.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
export class DrillModeEngine {
  private promptPool: KeyCombination[] = [];
  private combinationStats: Map<string, CombinationTrack> = new Map();
  private totalResponses = 0;
  private totalCorrect = 0;
  private totalResponseTimeMs = 0;
  private currentPrompt: KeyCombination | null = null;
  private promptStartTime = 0;
  private active = false;

  // Double-Escape detection
  private lastEscapeTime = 0;
  private escapeCallbacks: Array<() => void> = [];

  /**
   * Start a continuous drill session with the given configuration.
   * Uses config.customSet if provided, otherwise loads prompts for the category.
   */
  start(config: DrillConfig): void {
    this.promptPool = config.customSet && config.customSet.length > 0
      ? [...config.customSet]
      : [...getPromptsForCategory(config.category)];

    this.combinationStats = new Map();
    this.totalResponses = 0;
    this.totalCorrect = 0;
    this.totalResponseTimeMs = 0;
    this.lastEscapeTime = 0;
    this.active = true;

    // Initialize tracking for each combination in the pool
    for (const combo of this.promptPool) {
      const key = this.combinationKey(combo);
      if (!this.combinationStats.has(key)) {
        this.combinationStats.set(key, {
          combination: combo,
          attempts: 0,
          correctCount: 0,
          totalResponseTimeMs: 0,
        });
      }
    }

    // Set the first prompt
    this.currentPrompt = this.getWeightedNextPrompt();
    this.promptStartTime = Date.now();
  }

  /**
   * Stop the drill session and return summary statistics.
   * Returns DrillStats with accuracy, avgResponseTime, and top 3 most-missed.
   */
  stop(): DrillStats {
    this.active = false;

    const accuracy = this.totalResponses > 0
      ? this.totalCorrect / this.totalResponses
      : 0;

    const avgResponseTimeMs = this.totalResponses > 0
      ? this.totalResponseTimeMs / this.totalResponses
      : 0;

    // Find top 3 most-missed by error count descending
    const statsArray = Array.from(this.combinationStats.values());
    const withErrors = statsArray
      .filter(s => s.attempts - s.correctCount > 0)
      .sort((a, b) => {
        const errorsA = a.attempts - a.correctCount;
        const errorsB = b.attempts - b.correctCount;
        return errorsB - errorsA;
      });

    const mostMissed = withErrors
      .slice(0, 3)
      .map(s => s.combination);

    return {
      accuracy,
      avgResponseTimeMs,
      mostMissed,
      totalAttempts: this.totalResponses,
    };
  }

  /**
   * Handle user keyboard input during drill mode.
   * Checks for Escape key double-press, then matches input against current prompt.
   */
  handleInput(state: KeyState): void {
    if (!this.active || !this.currentPrompt) return;

    // Check for Escape key press (double-Escape detection)
    if (state.baseKey === 'Escape') {
      const now = Date.now();
      if (this.lastEscapeTime > 0 && (now - this.lastEscapeTime) <= 500) {
        // Double-Escape detected — fire callbacks
        this.lastEscapeTime = 0;
        for (const cb of this.escapeCallbacks) {
          cb();
        }
        return;
      }
      this.lastEscapeTime = now;
      return;
    }

    // Match against current prompt
    const result = match(this.currentPrompt, state);
    const responseTime = Date.now() - this.promptStartTime;
    const key = this.combinationKey(this.currentPrompt);
    const track = this.combinationStats.get(key);

    if (track) {
      track.attempts++;
      track.totalResponseTimeMs += responseTime;
      if (result.correct) {
        track.correctCount++;
      }
    }

    this.totalResponses++;
    this.totalResponseTimeMs += responseTime;
    if (result.correct) {
      this.totalCorrect++;
    }

    // Always advance to next prompt (both correct and incorrect responses count)
    this.currentPrompt = this.getWeightedNextPrompt();
    this.promptStartTime = Date.now();
  }

  /**
   * Get the next prompt using adaptive weighting.
   *
   * - If fewer than 10 responses recorded: uniform random selection.
   * - After 10 responses: combinations with errors or avg response time > 3s
   *   receive weight=2, others receive weight=1.
   */
  getWeightedNextPrompt(): KeyCombination {
    if (this.promptPool.length === 0) {
      throw new Error('Drill mode has no prompts in pool');
    }

    // Uniform random if fewer than 10 total responses
    if (this.totalResponses < 10) {
      const index = Math.floor(Math.random() * this.promptPool.length);
      return this.promptPool[index];
    }

    // Weighted selection after 10 responses
    const weights: number[] = this.promptPool.map(combo => {
      const key = this.combinationKey(combo);
      const track = this.combinationStats.get(key);

      if (!track || track.attempts === 0) {
        // No data yet — treat as normal weight
        return 1;
      }

      const hasErrors = track.attempts - track.correctCount > 0;
      const avgTime = track.totalResponseTimeMs / track.attempts;
      const isSlow = avgTime > 3000;

      return (hasErrors || isSlow) ? 2 : 1;
    });

    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < this.promptPool.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return this.promptPool[i];
      }
    }

    // Fallback (should not reach here due to floating-point, but safety)
    return this.promptPool[this.promptPool.length - 1];
  }

  /**
   * Register a callback for the double-Escape exit sequence.
   * Returns an unsubscribe function.
   */
  onEscapeSequence(callback: () => void): () => void {
    this.escapeCallbacks.push(callback);
    return () => {
      const index = this.escapeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.escapeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get the current prompt being displayed.
   */
  getCurrentPrompt(): KeyCombination | null {
    return this.currentPrompt;
  }

  /**
   * Check if the drill session is currently active.
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Create a unique string key for a KeyCombination for Map lookups.
   */
  private combinationKey(combo: KeyCombination): string {
    const m = combo.modifiers;
    return `${m.ctrl ? 1 : 0}${m.alt ? 1 : 0}${m.shift ? 1 : 0}${m.meta ? 1 : 0}:${combo.baseKey}`;
  }
}

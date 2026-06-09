import { useRef, useState, useCallback, useEffect } from 'react';
import type { DrillConfig, DrillStats, KeyCombination, KeyState } from '../domain/types';
import { DrillModeEngine } from '../domain/drill-mode-engine';

/**
 * React hook wrapping DrillModeEngine state and actions.
 *
 * Manages the drill session lifecycle including starting, stopping,
 * handling input, and tracking the double-Escape exit sequence.
 */
export function useDrillMode() {
  const engineRef = useRef<DrillModeEngine | null>(null);

  if (engineRef.current === null) {
    engineRef.current = new DrillModeEngine();
  }

  const [currentPrompt, setCurrentPrompt] = useState<KeyCombination | null>(null);
  const [stats, setStats] = useState<DrillStats | null>(null);
  const [isActive, setIsActive] = useState(false);

  const start = useCallback((config: DrillConfig) => {
    const engine = engineRef.current!;
    engine.start(config);
    setCurrentPrompt(engine.getCurrentPrompt());
    setStats(null);
    setIsActive(true);
  }, []);

  const stop = useCallback((): DrillStats => {
    const engine = engineRef.current!;
    const drillStats = engine.stop();
    setStats(drillStats);
    setCurrentPrompt(null);
    setIsActive(false);
    return drillStats;
  }, []);

  const handleInput = useCallback((keyState: KeyState) => {
    const engine = engineRef.current!;
    engine.handleInput(keyState);
    setCurrentPrompt(engine.getCurrentPrompt());
  }, []);

  const onEscapeSequence = useCallback((callback: () => void): (() => void) => {
    const engine = engineRef.current!;
    return engine.onEscapeSequence(callback);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      const engine = engineRef.current;
      if (engine?.isActive()) {
        engine.stop();
      }
    };
  }, []);

  return {
    start,
    stop,
    handleInput,
    currentPrompt,
    stats,
    isActive,
    onEscapeSequence,
  };
}

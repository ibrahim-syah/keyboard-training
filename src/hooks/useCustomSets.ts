import { useState, useCallback } from 'react';
import type { CustomTrainingSet, KeyCombination } from '../domain/types';
import {
  create,
  update,
  deleteSet,
  getAll,
  getPresets,
  exportToJSON,
  importFromJSON,
} from '../domain/custom-set-manager';

/**
 * React hook wrapping CustomSetManager CRUD operations.
 *
 * Provides reactive state for custom training sets and presets,
 * with action functions for create, update, delete, export, and import.
 */
export function useCustomSets() {
  const [sets, setSets] = useState<CustomTrainingSet[]>(() => getAll());
  const [presets] = useState<CustomTrainingSet[]>(() => getPresets());

  const reloadSets = useCallback(() => {
    setSets(getAll());
  }, []);

  const createSet = useCallback(
    (name: string, combinations: KeyCombination[]): CustomTrainingSet => {
      const newSet = create(name, combinations);
      reloadSets();
      return newSet;
    },
    [reloadSets],
  );

  const updateSet = useCallback(
    (
      id: string,
      changes: Partial<Pick<CustomTrainingSet, 'name' | 'combinations'>>,
    ): CustomTrainingSet => {
      const updated = update(id, changes);
      reloadSets();
      return updated;
    },
    [reloadSets],
  );

  const deleteCustomSet = useCallback(
    (id: string): void => {
      deleteSet(id);
      reloadSets();
    },
    [reloadSets],
  );

  const exportJSON = useCallback((id: string): string => {
    return exportToJSON(id);
  }, []);

  const importJSON = useCallback(
    (json: string): CustomTrainingSet => {
      const imported = importFromJSON(json);
      reloadSets();
      return imported;
    },
    [reloadSets],
  );

  return {
    sets,
    presets,
    create: createSet,
    update: updateSet,
    delete: deleteCustomSet,
    exportJSON,
    importJSON,
  };
}

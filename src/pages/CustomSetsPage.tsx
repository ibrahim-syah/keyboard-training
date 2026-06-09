import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { CustomTrainingSet, KeyCombination, KeyState } from '../domain/types';
import {
  create,
  update,
  deleteSet,
  getAll,
  getPresets,
  exportToJSON,
  importFromJSON,
} from '../domain/custom-set-manager';
import { createKeyCaptureEngine } from '../domain/key-capture-engine';
import { formatKeyCombination } from '../domain/key-display';
import type { KeyCaptureEngine } from '../domain/key-capture-engine';

const MIN_COMBINATIONS = 5;
const MAX_COMBINATIONS = 200;
const MAX_NAME_LENGTH = 50;

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
 * Check if two combinations are the same.
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

// --- SetEditor Component ---

interface SetEditorProps {
  initialName?: string;
  initialCombinations?: KeyCombination[];
  onSave: (name: string, combinations: KeyCombination[]) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

function SetEditor({
  initialName = '',
  initialCombinations = [],
  onSave,
  onCancel,
  isEditing = false,
}: SetEditorProps) {
  const [name, setName] = useState(initialName);
  const [combinations, setCombinations] = useState<KeyCombination[]>(initialCombinations);
  const [isRecording, setIsRecording] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const engineRef = useRef<KeyCaptureEngine | null>(null);

  const handleCombinationCaptured = useCallback((state: KeyState) => {
    const combo = keyStateToCombination(state);
    if (!combo) return;

    setCombinations((prev) => {
      // Don't add duplicates
      if (prev.some((existing) => combinationsEqual(existing, combo))) {
        return prev;
      }
      return [...prev, combo];
    });
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

  const handleNameChange = (value: string) => {
    setName(value);
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setNameError('Name cannot be empty');
    } else if (trimmed.length > MAX_NAME_LENGTH) {
      setNameError(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
    } else {
      setNameError(null);
    }
  };

  const removeCombination = (index: number) => {
    setCombinations((prev) => prev.filter((_, i) => i !== index));
  };

  const trimmedName = name.trim();
  const canSave =
    trimmedName.length >= 1 &&
    trimmedName.length <= MAX_NAME_LENGTH &&
    combinations.length >= MIN_COMBINATIONS &&
    combinations.length <= MAX_COMBINATIONS;

  const getLimitMessage = (): string | null => {
    if (combinations.length < MIN_COMBINATIONS) {
      return `At least ${MIN_COMBINATIONS} combinations required (currently ${combinations.length})`;
    }
    if (combinations.length > MAX_COMBINATIONS) {
      return `Maximum ${MAX_COMBINATIONS} combinations allowed (currently ${combinations.length})`;
    }
    return null;
  };

  const limitMessage = getLimitMessage();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {isEditing ? 'Edit Training Set' : 'Create Training Set'}
      </h3>

      {/* Name input */}
      <div className="mb-4">
        <label htmlFor="set-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name
        </label>
        <input
          id="set-name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="My Training Set"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          maxLength={MAX_NAME_LENGTH + 10}
        />
        {nameError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{nameError}</p>
        )}
      </div>

      {/* Recording controls */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsRecording(!isRecording)}
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
              ● Recording — press key combinations...
            </span>
          )}
        </div>
      </div>

      {/* Limit message */}
      {limitMessage && (
        <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
          {limitMessage}
        </p>
      )}

      {/* Combinations list */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Combinations ({combinations.length})
        </h4>
        {combinations.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            No combinations recorded yet. Click "Start Recording" and press key combinations.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {combinations.map((combo, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-800 dark:text-gray-200"
              >
                {formatKeyCombination(combo)}
                <button
                  type="button"
                  onClick={() => removeCombination(index)}
                  className="ml-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                  aria-label={`Remove ${formatKeyCombination(combo)}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onSave(name, combinations)}
          disabled={!canSave}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEditing ? 'Update Set' : 'Save Set'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- Main CustomSetsPage Component ---

export default function CustomSetsPage() {
  const [customSets, setCustomSets] = useState<CustomTrainingSet[]>([]);
  const [presetSets, setPresetSets] = useState<CustomTrainingSet[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingSet, setEditingSet] = useState<CustomTrainingSet | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setCustomSets(getAll());
    setPresetSets(getPresets());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateNew = () => {
    setEditingSet(null);
    setShowEditor(true);
    setImportError(null);
  };

  const handleEdit = (set: CustomTrainingSet) => {
    setEditingSet(set);
    setShowEditor(true);
    setImportError(null);
  };

  const handleSave = (name: string, combinations: KeyCombination[]) => {
    try {
      if (editingSet) {
        update(editingSet.id, { name, combinations });
      } else {
        create(name, combinations);
      }
      setShowEditor(false);
      setEditingSet(null);
      loadData();
    } catch (error) {
      // Error from validation will be caught at the domain level
      // This shouldn't happen since we validate in the editor,
      // but just in case:
      console.error('Failed to save set:', error);
    }
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingSet(null);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteSet(deleteConfirmId);
      setDeleteConfirmId(null);
      loadData();
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleExport = (id: string) => {
    try {
      const json = exportToJSON(id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const set = customSets.find((s) => s.id === id);
      a.href = url;
      a.download = `${set?.name ?? 'training-set'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content !== 'string') {
        setImportError('Failed to read file content');
        return;
      }
      try {
        importFromJSON(content);
        setImportError(null);
        loadData();
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Import failed');
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read the file');
    };
    reader.readAsText(file);

    // Reset the input so the same file can be imported again
    event.target.value = '';
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Custom Training Sets
      </h1>

      {/* Editor section */}
      {showEditor ? (
        <div className="mb-8">
          <SetEditor
            initialName={editingSet?.name}
            initialCombinations={editingSet?.combinations}
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={!!editingSet}
          />
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            + Create New Set
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Import error display */}
      {importError && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-300">
            <span className="font-medium">Import Error:</span> {importError}
          </p>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
            Are you sure you want to delete this training set? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={confirmDelete}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={cancelDelete}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Custom sets list */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Your Sets
        </h2>
        {customSets.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No custom training sets yet. Create one or import from JSON.
          </p>
        ) : (
          <div className="grid gap-4">
            {customSets.map((set) => (
              <div
                key={set.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {set.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {set.combinations.length} combinations
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/drill"
                    className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50"
                  >
                    Use in Drill
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleEdit(set)}
                    className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport(set.id)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(set.id)}
                    className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Preset training sets */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Preset Training Sets
        </h2>
        <div className="grid gap-4">
          {presetSets.map((preset) => (
            <div
              key={preset.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between border-l-4 border-purple-500"
            >
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {preset.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {preset.combinations.length} combinations • Read-only preset
                </p>
              </div>
              <Link
                to="/drill"
                className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50"
              >
                Use in Drill
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

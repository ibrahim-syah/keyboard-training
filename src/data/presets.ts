import type { KeyCombination } from '../domain/types';

/**
 * A bundled preset training set definition.
 */
export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  combinations: KeyCombination[];
}

/**
 * VS Code keyboard shortcuts preset.
 * Common editor shortcuts for macOS.
 */
const vscodeShortcuts: PresetDefinition = {
  id: 'vscode-shortcuts',
  name: 'VS Code Shortcuts',
  description: 'Common VS Code keyboard shortcuts for macOS including file navigation, editing, and terminal commands.',
  combinations: [
    // File & Navigation
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyP' },         // Quick Open
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyP' },          // Command Palette
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyB' },         // Toggle Sidebar
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyJ' },         // Toggle Panel
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyE' },          // Show Explorer
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyF' },          // Find in Files
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyW' },         // Close Tab
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyN' },         // New File
    // Editing
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyD' },         // Add Selection to Next Find Match
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyL' },         // Select Line
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyK' },          // Delete Line
    { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'ArrowUp' },      // Move Line Up
    { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'ArrowDown' },    // Move Line Down
    { modifiers: { ctrl: false, alt: true, shift: true, meta: false }, baseKey: 'ArrowUp' },       // Copy Line Up
    { modifiers: { ctrl: false, alt: true, shift: true, meta: false }, baseKey: 'ArrowDown' },     // Copy Line Down
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'Slash' },        // Toggle Line Comment
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'Slash' },         // Toggle Block Comment
    // Terminal & Debug
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'Backquote' },    // Toggle Terminal
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'Backquote' },     // New Terminal
    { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F5' },          // Start Debugging
    { modifiers: { ctrl: false, alt: false, shift: true, meta: false }, baseKey: 'F5' },           // Stop Debugging
    // Multi-cursor & Selection
    { modifiers: { ctrl: false, alt: true, shift: false, meta: true }, baseKey: 'ArrowUp' },       // Add Cursor Above
    { modifiers: { ctrl: false, alt: true, shift: false, meta: true }, baseKey: 'ArrowDown' },     // Add Cursor Below
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyL' },          // Select All Occurrences
    // Go to
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyG' },         // Go to Line
    { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, baseKey: 'F12' },         // Go to Definition
  ],
};

/**
 * macOS Terminal keyboard shortcuts preset.
 * Common terminal control sequences and navigation.
 */
const macosTerminalShortcuts: PresetDefinition = {
  id: 'macos-terminal-shortcuts',
  name: 'macOS Terminal Shortcuts',
  description: 'Essential terminal shortcuts for shell navigation, process control, and text editing in macOS Terminal or iTerm2.',
  combinations: [
    // Process control
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyC' },         // Interrupt (SIGINT)
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyD' },         // EOF / Exit
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyZ' },         // Suspend (SIGTSTP)
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyL' },         // Clear Screen
    // Line navigation
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyA' },         // Move to beginning of line
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyE' },         // Move to end of line
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyF' },         // Move forward one character
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyB' },         // Move backward one character
    // Text editing
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyU' },         // Delete from cursor to start of line
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyK' },         // Delete from cursor to end of line
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyW' },         // Delete word before cursor
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyY' },         // Paste (yank) killed text
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyT' },         // Transpose characters
    // History
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyR' },         // Reverse search history
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyP' },         // Previous command
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyN' },         // Next command
    // Word navigation (Alt-based)
    { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyF' },         // Move forward one word
    { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyB' },         // Move backward one word
    { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyD' },         // Delete word after cursor
    // Tab & Terminal management
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyT' },         // New Tab
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyK' },         // Clear scrollback
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'BracketLeft' },   // Previous Tab
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'BracketRight' },  // Next Tab
    // Misc
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyG' },         // Cancel / Bell
    { modifiers: { ctrl: true, alt: false, shift: false, meta: false }, baseKey: 'KeyS' },         // Freeze output (XOFF)
  ],
};

/**
 * Figma keyboard shortcuts preset.
 * Common design tool shortcuts for macOS.
 */
const figmaShortcuts: PresetDefinition = {
  id: 'figma-shortcuts',
  name: 'Figma Shortcuts',
  description: 'Common Figma design tool shortcuts for grouping, alignment, layers, and object manipulation on macOS.',
  combinations: [
    // Grouping & Framing
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyG' },         // Group Selection
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyG' },          // Ungroup
    { modifiers: { ctrl: false, alt: true, shift: false, meta: true }, baseKey: 'KeyG' },          // Frame Selection
    // Layers & Arrangement
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'BracketRight' }, // Bring Forward
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'BracketLeft' },  // Send Backward
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'BracketRight' },  // Bring to Front
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'BracketLeft' },   // Send to Back
    // Object manipulation
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyD' },         // Duplicate
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyR' },         // Rename
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyH' },          // Flip Horizontal
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'KeyV' },          // Flip Vertical
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyE' },         // Flatten
    // View & Zoom
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'Digit1' },        // Zoom to Fit
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'Digit0' },       // Zoom to 100%
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'Digit1' },       // Zoom to Selection
    { modifiers: { ctrl: false, alt: false, shift: true, meta: true }, baseKey: 'Digit3' },        // Zoom to Selection (Next Page)
    // Alignment
    { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyA' },         // Align Left
    { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyD' },         // Align Right
    { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyW' },         // Align Top
    { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyS' },         // Align Bottom
    { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyH' },         // Align Horizontal Center
    { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, baseKey: 'KeyV' },         // Align Vertical Center
    // Components & Styles
    { modifiers: { ctrl: false, alt: true, shift: false, meta: true }, baseKey: 'KeyK' },          // Create Component
    { modifiers: { ctrl: false, alt: true, shift: false, meta: true }, baseKey: 'KeyB' },          // Detach Instance
    // Text & Misc
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyB' },         // Bold
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyI' },         // Italic
    { modifiers: { ctrl: false, alt: false, shift: false, meta: true }, baseKey: 'KeyU' },         // Underline
  ],
};

/**
 * All available preset training sets.
 */
export const PRESETS: PresetDefinition[] = [
  vscodeShortcuts,
  macosTerminalShortcuts,
  figmaShortcuts,
];

/**
 * Get a preset by its ID.
 */
export function getPresetById(id: string): PresetDefinition | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

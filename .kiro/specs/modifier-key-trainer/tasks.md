# Implementation Plan: Modifier Key Trainer

## Overview

A client-side React + TypeScript web application for practicing modifier keys, number keys, function keys, and multi-key combinations on macOS. The implementation follows a layered architecture: infrastructure/domain utilities first, then application logic, then presentation, with wiring and integration at the end. All code uses Vite as the build tool, TailwindCSS for styling, Chart.js for visualization, and Vitest + fast-check for testing.

## Tasks

- [x] 1. Set up project structure and core types
  - [x] 1.1 Initialize Vite + React + TypeScript project with TailwindCSS
    - Run `npm create vite@latest` with React + TypeScript template
    - Install dependencies: tailwindcss, postcss, autoprefixer, chart.js, react-chartjs-2, react-router-dom
    - Install dev dependencies: vitest, fast-check, @testing-library/react, jsdom
    - Configure Vite, Tailwind, and Vitest in their respective config files
    - Set up `src/` directory structure: `components/`, `hooks/`, `domain/`, `infrastructure/`, `data/`, `pages/`
    - _Requirements: All (project foundation)_

  - [x] 1.2 Define core TypeScript types and interfaces
    - Create `src/domain/types.ts` with: `KeyState`, `KeyCombination`, `ModifierSet`, `KeyCategory`, `DifficultyLevel`, `MatchResult`, `PromptResult`, `SessionRecord`, `CombinationStat`, `CustomTrainingSet`, `TrainingSetExportFormat`, `ExerciseConfig`, `ExerciseState`, `DrillConfig`, `DrillStats`, `CategoryProgress`, `LevelCriteria`, `StoredSettings`, `PlatformInfo`
    - Define the `KeyCategory` union type: `'modifiers' | 'numbers' | 'function-keys' | 'navigation' | 'combinations'`
    - _Requirements: 1.1, 1.3, 2.1, 5.1, 6.2, 7.2_

  - [x] 1.3 Create OS-reserved combinations constant and key data
    - Create `src/data/os-reserved.ts` with the hardcoded list of macOS-reserved combinations (Cmd+Tab, Cmd+Q, Cmd+Space, Cmd+H, Cmd+M, Ctrl+Up/Down/Left/Right)
    - Create `src/data/key-prompts.ts` with at least 15 distinct KeyPrompts per category (modifiers, numbers, function keys, navigation, combinations at each difficulty level)
    - _Requirements: 2.6, 8.2_

  - [x] 1.4 Create preset training sets data
    - Create `src/data/presets.ts` with preset training sets for VS Code shortcuts, macOS Terminal shortcuts, and Figma shortcuts
    - Each preset must have id, name, description, and combinations array with valid event.code values
    - _Requirements: 6.5_

- [x] 2. Implement Key Capture Engine and Key Matcher
  - [x] 2.1 Implement the Key Capture Engine
    - Create `src/domain/key-capture-engine.ts`
    - Implement `enable(exerciseActive)` that attaches keydown/keyup listeners to `window`
    - On keydown: check `event.repeat` (ignore if true), extract modifier flags from ctrlKey/shiftKey/altKey/metaKey, read `event.code` for left/right modifier distinction, call `preventDefault` if exerciseActive is true
    - Track keyup events to maintain current held-key state
    - Fire `onKeyCombination` callback when base key is pressed while all required modifiers are held
    - Ensure key identification completes within 16ms (synchronous event handling)
    - Implement `disable()` to remove all listeners and reset state
    - Implement `getCurrentState()` for visual keyboard access
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7_

  - [x] 2.2 Write property test for key state extraction
    - **Property 1: Key state extraction preserves all event information**
    - Generate random modifier flag combinations + event.code values → verify KeyState output exactly reflects all held modifiers with left/right distinction
    - **Validates: Requirements 1.1, 1.3**

  - [x] 2.3 Write property test for preventDefault behavior
    - **Property 2: preventDefault is called if and only if exercise is active**
    - Generate random keydown events × exercise-active boolean → verify preventDefault called iff active
    - **Validates: Requirements 1.2**

  - [x] 2.4 Write property test for repeat event filtering
    - **Property 3: Repeat events are always ignored**
    - Generate random events with `event.repeat = true` → verify onKeyCombination never fires
    - **Validates: Requirements 1.6**

  - [x] 2.5 Write property test for combination completion logic
    - **Property 4: Combination completion requires all modifiers held plus base key**
    - Generate random key sequences against target combinations → verify combination fires only when base key pressed while all required modifiers held
    - **Validates: Requirements 1.7**

  - [x] 2.6 Implement the Key Matcher
    - Create `src/domain/key-matcher.ts`
    - Implement `match(expected: KeyCombination, actual: KeyState): MatchResult`
    - Compare modifier set (ctrl, alt, shift, meta) and base key between expected and actual
    - Return correct/incorrect boolean with timestamp, expected, and actual values
    - _Requirements: 1.1, 1.7, 3.3, 3.4_

- [x] 3. Implement Platform Detector and Display Utilities
  - [x] 3.1 Implement Platform Detector
    - Create `src/infrastructure/platform-detector.ts`
    - Detect macOS via `navigator.userAgent` or `navigator.platform`
    - Return `PlatformInfo` with `isMacOS` boolean and raw `userAgent` string
    - _Requirements: 8.4_

  - [x] 3.2 Implement key display formatting utility
    - Create `src/domain/key-display.ts`
    - Implement function to format a `KeyCombination` into macOS symbol string
    - Use symbols: ⌃ for Ctrl, ⌥ for Alt/Option, ⇧ for Shift, ⌘ for Cmd
    - Enforce canonical order: ⌃ → ⌥ → ⇧ → ⌘ → base key
    - Append Fn/Globe symbol when base key is F1–F12
    - Map `event.code` values to human-readable key names
    - _Requirements: 3.1, 3.2, 8.1, 8.5_

  - [x] 3.3 Write property test for display formatting
    - **Property 8: Display formatting follows macOS conventions and canonical order**
    - Generate random KeyCombinations → verify display uses correct symbols, canonical order, and includes Fn iff F1-F12
    - **Validates: Requirements 3.2, 8.1, 8.5**

- [x] 4. Implement LocalStorage Adapter and Progress Tracker
  - [x] 4.1 Implement LocalStorage adapter
    - Create `src/infrastructure/storage-adapter.ts`
    - Implement get/set/delete operations with `mkt_` key prefix namespace
    - Wrap all reads in try/catch with fallback to defaults
    - Detect storage availability and quota exceeded errors
    - Implement pruning logic for sessions older than 90 days when quota exceeded
    - _Requirements: 5.1, 5.5_

  - [x] 4.2 Implement Progress Tracker
    - Create `src/domain/progress-tracker.ts`
    - Implement `saveSession(record)` that serializes to localStorage via adapter
    - Implement `getSessions(category?, days?)` with date filtering
    - Implement `getWeakestCombinations(limit)` ranked by lowest accuracy, ties broken by slowest response time
    - Implement `getProficiencyRating(category)` using star thresholds: 1★ <50%, 2★ 50-70%, 3★ 70-85%, 4★ 85-95%, 5★ ≥95% AND avgTime <1s (else 4★); return null if <5 sessions
    - Implement `isStorageAvailable()` check
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 4.3 Write property test for session persistence round-trip
    - **Property 14: Session persistence round-trip preserves data**
    - Generate random SessionRecords → serialize to localStorage → deserialize → verify deep equality
    - **Validates: Requirements 5.1**

  - [x] 4.4 Write property test for 30-day session filter
    - **Property 15: Session filter returns only records within 30 days**
    - Generate random dated sessions spanning >30 days → verify only recent ones returned
    - **Validates: Requirements 5.2**

  - [x] 4.5 Write property test for weakest combination ranking
    - **Property 16: Weakest combinations ranked by lowest accuracy then slowest response time**
    - Generate random CombinationStats → verify ranking by accuracy asc, then response time desc for ties
    - **Validates: Requirements 5.3**

  - [x] 4.6 Write property test for proficiency star rating
    - **Property 17: Proficiency star rating follows threshold rules**
    - Generate random (accuracy, avgResponseTime, sessionCount) tuples → verify star calculation
    - **Validates: Requirements 5.4, 5.6**

- [x] 5. Checkpoint - Core domain layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Exercise Controller
  - [x] 6.1 Implement Exercise Controller
    - Create `src/domain/exercise-controller.ts`
    - Implement `start(config)` that initializes exercise state with prompt list, clamping promptCount to [10, 50]
    - Implement `handleInput(state)` that uses KeyMatcher to check correctness
    - On correct: record result with responseTime, advance to next prompt after delay
    - On incorrect: record attempt, keep current prompt unchanged
    - Track timing from prompt display to correct input
    - Implement `getState()` and `onStateChange(callback)` for reactive UI updates
    - Fire state change to 'complete' when all prompts answered
    - _Requirements: 2.5, 3.3, 3.4_

  - [x] 6.2 Write property test for prompt count clamping
    - **Property 7: Exercise prompt count is bounded to [10, 50]**
    - Generate random integers (negatives, zero, large numbers) → verify clamping to [10, 50]
    - **Validates: Requirements 2.5**

  - [x] 6.3 Write property test for incorrect input preserving prompt
    - **Property 9: Incorrect input preserves the current prompt**
    - Generate random non-matching inputs for a given prompt → verify currentPromptIndex unchanged and attempt recorded
    - **Validates: Requirements 3.4**

  - [x] 6.4 Implement category filtering and mixed-mode selection
    - Create `src/domain/prompt-selector.ts`
    - Implement `getPromptsForCategory(category, count)` that filters available prompts by category
    - Implement `getMixedPrompts(count)` that draws from all categories with equal probability per category
    - Filter out OS-reserved combinations from prompt lists, triggering skip notice for each
    - _Requirements: 2.3, 2.4, 8.3_

  - [x] 6.5 Write property test for category filter
    - **Property 5: Category filter returns only prompts from selected category**
    - Generate random category selections → verify all returned prompts match selected category
    - **Validates: Requirements 2.3**

  - [x] 6.6 Write property test for mixed-mode distribution
    - **Property 6: Mixed-mode draws from all categories with approximately equal probability**
    - Generate 500+ mixed selections → verify each category proportion within ±20% of uniform
    - **Validates: Requirements 2.4**

  - [x] 6.7 Write property test for OS-reserved combination skipping
    - **Property 24: OS-reserved combinations are never presented for user input**
    - Generate prompt lists including reserved combos → verify all reserved combos are skipped
    - **Validates: Requirements 8.3**

- [x] 7. Implement Drill Mode Engine
  - [x] 7.1 Implement Drill Mode Engine
    - Create `src/domain/drill-mode-engine.ts`
    - Implement `start(config)` that initializes continuous drill session
    - Implement adaptive `getWeightedNextPrompt()`: if <10 responses, use uniform random; after 10, assign ≥2x weight to combinations with errors or response time >3s
    - Implement `handleInput(state)` tracking per-combination accuracy and response time
    - Implement `stop()` returning DrillStats with accuracy, avgResponseTime, and top 3 most-missed
    - Implement double-Escape detection (two Escape presses within 500ms) via `onEscapeSequence` callback
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 7.2 Write property test for adaptive drill weighting
    - **Property 11: Adaptive drill weighting gives missed combinations at least 2x frequency**
    - Generate random response histories → verify missed combos get ≥2x selection probability
    - **Validates: Requirements 4.2**

  - [x] 7.3 Write property test for drill accuracy computation
    - **Property 12: Drill accuracy equals correct responses divided by total**
    - Generate random response sequences → verify accuracy = correctCount/total, avgTime = mean of all times
    - **Validates: Requirements 4.4**

  - [x] 7.4 Write property test for most-missed ranking
    - **Property 13: Most-missed combinations are ranked by highest error count**
    - Generate random session results → verify top-3 ranked by error count descending
    - **Validates: Requirements 4.5**

- [x] 8. Implement Difficulty Manager
  - [x] 8.1 Implement Difficulty Manager
    - Create `src/domain/difficulty-manager.ts`
    - Implement level classification: Level 1 (2-key with Cmd/Shift), Level 2 (2-key with Ctrl/Alt), Level 3 (3-key), Level 4 (4-key)
    - Implement `checkProgression(category, stats)`: unlock next level if accuracy >90% AND avgResponseTime <1000ms AND attempts ≥20
    - Implement `getAvailableLevels(category)` returning current and all unlocked levels
    - Implement `getPromptsForLevel(category, level)` returning appropriate combinations
    - Implement `overrideAll(category)` for manual override to access any level
    - Ensure new categories start with 10 single-key prompts before introducing combinations
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 8.2 Write property test for difficulty level classification
    - **Property 22: Difficulty level classification follows key count and modifier rules**
    - Generate random KeyCombinations → verify correct level assignment based on key count and modifier type
    - **Validates: Requirements 7.2**

  - [x] 8.3 Write property test for level progression criteria
    - **Property 23: Level progression unlocks only when all criteria met**
    - Generate random (accuracy, avgResponseTime, attempts) tuples → verify unlock iff all three criteria met
    - **Validates: Requirements 7.3, 7.4**

  - [x] 8.4 Write property test for new category single-key start
    - **Property 21: New category training starts with single-key prompts**
    - Simulate new category starts → verify first 10 prompts are all single-key (no modifiers)
    - **Validates: Requirements 7.1**

- [x] 9. Implement Custom Set Manager
  - [x] 9.1 Implement Custom Set Manager
    - Create `src/domain/custom-set-manager.ts`
    - Implement `create(name, combinations)`: validate name (trim, 1-50 chars), validate size (5-200 combos), generate UUID, persist via storage adapter
    - Implement `update(id, changes)` and `delete(id)` with validation
    - Implement `getAll()`, `getById(id)`, `getPresets()`
    - Implement `exportToJSON(id)` producing `TrainingSetExportFormat` with version field
    - Implement `importFromJSON(json)` with validation: parse JSON, check structure, verify valid key codes, reject with specific error messages on failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 9.2 Write property test for custom set name validation
    - **Property 18: Custom set name validation accepts trimmed names of length 1-50**
    - Generate random strings → verify trim + length check, stored name is trimmed version
    - **Validates: Requirements 6.2**

  - [x] 9.3 Write property test for JSON export/import round-trip
    - **Property 19: Custom training set JSON export/import round-trip**
    - Generate random valid CustomTrainingSets → export to JSON → import → verify equivalent name and combinations
    - **Validates: Requirements 6.3**

  - [x] 9.4 Write property test for custom set size bounds
    - **Property 20: Custom set size bounded to [5, 200]**
    - Generate random-length combination lists → verify save succeeds iff length ∈ [5, 200]
    - **Validates: Requirements 6.6**

- [x] 10. Checkpoint - Application logic layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement React pages and components - Exercise flow
  - [x] 11.1 Set up React Router and page layout
    - Create `src/App.tsx` with React Router configuration
    - Define routes: `/` (home), `/exercise` (exercise), `/drill` (drill mode), `/progress` (progress), `/custom-sets` (custom sets)
    - Create shared layout component with navigation between pages
    - Add platform detection: show notice if non-macOS detected
    - _Requirements: 8.4_

  - [x] 11.2 Implement PromptDisplay component
    - Create `src/components/PromptDisplay.tsx`
    - Display current Key_Prompt using macOS symbols with minimum 24px font size
    - Show success feedback (green flash/checkmark) within 100ms of correct input
    - Show error feedback (red flash + display of pressed keys) within 100ms of incorrect input
    - Implement 500-1000ms delay between correct answer and next prompt
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 11.3 Implement VisualKeyboard component
    - Create `src/components/VisualKeyboard.tsx`
    - Render a macOS keyboard layout SVG or div-based representation
    - Highlight keys that correspond to the current Key_Prompt (all modifier keys + base key)
    - Implement 10-second inactivity pulse animation to re-attract attention
    - Show currently held keys in real-time using KeyCaptureEngine.getCurrentState()
    - _Requirements: 3.5, 3.6_

  - [x] 11.4 Write property test for keyboard highlight accuracy
    - **Property 10: Keyboard highlight set matches combination constituents**
    - Generate random KeyCombinations → verify highlighted key IDs equal exactly the combination's keys
    - **Validates: Requirements 3.5**

  - [x] 11.5 Implement ExercisePage
    - Create `src/pages/ExercisePage.tsx`
    - Add category selection UI with options for each KeyCategory plus mixed mode
    - Add prompt count configuration (slider/input clamped to 10-50)
    - Wire ExerciseController to PromptDisplay and VisualKeyboard
    - Show exercise progress (current prompt number / total)
    - Display completion summary with accuracy and average response time
    - Save session to ProgressTracker on completion
    - Show notification for OS-reserved combinations that are unavailable (3-second auto-dismiss per Req 1.4)
    - _Requirements: 1.4, 2.1, 2.3, 2.4, 2.5, 3.1, 3.3, 3.4, 5.1, 8.3_

  - [x] 11.6 Implement HomePage
    - Create `src/pages/HomePage.tsx`
    - Display navigation to exercise, drill mode, progress, and custom sets
    - Show quick-start options for each key category
    - Display proficiency stars per category if available
    - _Requirements: 2.1_

- [x] 12. Implement React pages - Drill Mode and Progress
  - [x] 12.1 Implement DrillPage
    - Create `src/pages/DrillPage.tsx`
    - Add category/custom-set selection for drill mode
    - Wire DrillModeEngine to PromptDisplay and VisualKeyboard
    - Display live accuracy and response time during drill
    - Implement double-Escape exit with confirmation
    - Display DrillSummary component on session end (accuracy, avg time, top 3 most-missed)
    - Integrate difficulty level gating (only present unlocked levels unless override)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.3, 7.4, 7.5_

  - [x] 12.2 Implement ProgressPage
    - Create `src/pages/ProgressPage.tsx`
    - Implement TrendChart component using Chart.js + react-chartjs-2 showing accuracy and speed over last 30 days
    - Display weakest 5 combinations ranked by accuracy (ties by response time)
    - Display proficiency stars per category (or "N more sessions needed" message)
    - Handle chart rendering failure with fallback text-based stats table
    - Show inline notification if storage unavailable
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 12.3 Implement CustomSetsPage
    - Create `src/pages/CustomSetsPage.tsx`
    - Implement SetEditor component: record combinations by pressing them on keyboard, display captured list
    - Implement name input with trim and 1-50 char validation
    - Show save prevention with limit message if <5 or >200 combinations
    - Implement edit mode: add/remove combinations from existing sets
    - Implement delete with confirmation prompt
    - Implement JSON import (file picker) with error display for malformed/invalid imports
    - Implement JSON export (file download)
    - Display preset training sets (VS Code, Terminal, Figma) as read-only options
    - Allow selecting custom/preset sets for use in drill mode
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 13. Implement Difficulty Progression UI
  - [x] 13.1 Implement difficulty level UI and progression display
    - Create `src/components/DifficultyIndicator.tsx` showing current level and progress toward next
    - Add level selection UI in ExercisePage and DrillPage (locked levels greyed out)
    - Implement manual override toggle to unlock all levels
    - Show single-key-only notice for first 10 prompts in new categories
    - Wire DifficultyManager to exercise/drill prompt selection
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 14. Checkpoint - Presentation layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Integration wiring and final features
  - [x] 15.1 Wire all domain services with React hooks
    - Create `src/hooks/useKeyCaptureEngine.ts` hook managing engine lifecycle
    - Create `src/hooks/useExercise.ts` hook wrapping ExerciseController state
    - Create `src/hooks/useDrillMode.ts` hook wrapping DrillModeEngine state
    - Create `src/hooks/useProgress.ts` hook wrapping ProgressTracker queries
    - Create `src/hooks/useCustomSets.ts` hook wrapping CustomSetManager CRUD
    - Create `src/hooks/useDifficulty.ts` hook wrapping DifficultyManager state per category
    - Ensure KeyCaptureEngine enables/disables correctly on page navigation (enable with exerciseActive=true on exercise/drill pages, disable on others)
    - _Requirements: 1.2, All (integration)_

  - [x] 15.2 Implement OS-reserved combination notifications and skip logic
    - When exercise/drill encounters OS-reserved combo in prompt list: skip it, show inline notice "reserved by macOS", auto-advance after 2 seconds
    - When user presses OS-intercepted combo (detected by not receiving expected event): show 3-second auto-dismissing notification
    - Handle edge case where all prompts in a drill are OS-reserved (end drill with message)
    - _Requirements: 1.4, 8.2, 8.3_

  - [x] 15.3 Write integration tests for exercise flow
    - Test full exercise flow: start → correct/incorrect inputs → complete → session saved
    - Test OS-reserved combination skipping during exercise
    - Test prompt count boundary (10 and 50)
    - _Requirements: 2.5, 3.3, 3.4, 5.1, 8.3_

  - [x] 15.4 Write integration tests for drill mode flow
    - Test drill start → respond to prompts → double-Escape exit → summary displayed
    - Test adaptive weighting after 10 responses
    - Test drill with custom training set
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 6.4_

  - [x] 15.5 Write integration tests for custom set lifecycle
    - Test create → edit → export → import → use in drill → delete
    - Test import validation with malformed JSON
    - Test size bounds enforcement
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7_

- [x] 16. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each architectural layer
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project is greenfield — task 1.1 bootstraps the entire codebase
- All state is client-side (localStorage); no backend or deployment tasks needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.6", "3.1", "3.2", "4.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.3", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5", "4.6", "6.1", "6.4"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.5", "6.6", "6.7", "7.1", "8.1", "9.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "8.2", "8.3", "8.4", "9.2", "9.3", "9.4"] },
    { "id": 7, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 8, "tasks": ["11.4", "11.5", "11.6", "12.1", "12.2", "12.3"] },
    { "id": 9, "tasks": ["13.1"] },
    { "id": 10, "tasks": ["15.1", "15.2"] },
    { "id": 11, "tasks": ["15.3", "15.4", "15.5"] }
  ]
}
```

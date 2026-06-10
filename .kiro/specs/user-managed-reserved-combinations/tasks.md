# Implementation Plan: User-Managed Reserved Combinations

## Overview

This plan incrementally adds user-customizable reserved combination management to the existing keyboard trainer. It starts with the data layer (expanded default list), then builds the domain logic (ReservedListManager), integrates with the existing prompt selector, and finally adds the settings UI. Each step preserves backward compatibility with existing functionality.

## Tasks

- [x] 1. Create expanded default reserved list data module
  - [x] 1.1 Create `src/data/default-reserved.ts` with OS and browser reserved combinations
    - Define `OS_RESERVED` array with existing macOS OS-level combinations (Cmd+Tab, Cmd+Q, Cmd+Space, Cmd+H, Cmd+M, Ctrl+Up, Ctrl+Down, Ctrl+Left, Ctrl+Right)
    - Define `BROWSER_RESERVED` array with browser-reserved combinations (Cmd+W, Cmd+T, Cmd+N, Cmd+L, Cmd+R, Cmd+Shift+T, Cmd+Shift+N, Cmd+Shift+W)
    - Export `DEFAULT_RESERVED_COMBINATIONS` as the merged array
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Update `src/data/os-reserved.ts` for backward compatibility
    - Re-export from `default-reserved.ts` so existing imports still work
    - Keep `isOsReserved` function delegating to the new module
    - Ensure no existing tests break
    - _Requirements: 1.1, 1.2_

- [x] 2. Implement ReservedListManager domain module
  - [x] 2.1 Create `src/domain/reserved-list-manager.ts` with core pure functions
    - Define `UserOverrides` interface with `additions` and `removals` arrays
    - Implement `getEffectiveList(defaults, overrides)` → computes `(defaults ∪ additions) ∖ removals`
    - Implement `isReserved(combo, effectiveList)` → checks membership using deep equality
    - Implement `addCombination(overrides, combo, defaults)` → returns new overrides with combo added, rejects duplicates
    - Implement `removeCombination(overrides, combo, defaults)` → adds to removals for defaults, removes from additions for user-added
    - Implement `resetOverrides()` → returns empty `{ additions: [], removals: [] }`
    - _Requirements: 1.3, 2.1, 2.2, 3.1_

  - [x] 2.2 Add serialization and persistence functions to `src/domain/reserved-list-manager.ts`
    - Implement `serializeOverrides(overrides)` → JSON string
    - Implement `deserializeOverrides(json)` → validated UserOverrides or null on invalid data
    - Implement `loadOverrides()` → reads from storage adapter with `reserved_overrides` key, falls back to empty overrides
    - Implement `saveOverrides(overrides)` → persists via storage adapter, returns boolean success
    - Implement `clearOverrides()` → removes the storage key
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 7.1, 7.2, 7.3_

  - [ ]* 2.3 Write property test: Add then reserved (Property 1)
    - **Property 1: Add then reserved**
    - For any valid KeyCombination not in the effective list, adding it results in `isReserved` returning true
    - **Validates: Requirements 2.1**

  - [ ]* 2.4 Write property test: Duplicate addition rejection (Property 2)
    - **Property 2: Duplicate addition rejection**
    - For any KeyCombination already in the effective list, adding it again returns unchanged overrides
    - **Validates: Requirements 2.2**

  - [ ]* 2.5 Write property test: Remove then not reserved (Property 3)
    - **Property 3: Remove then not reserved**
    - For any KeyCombination in the effective list, removing it results in `isReserved` returning false
    - **Validates: Requirements 3.1**

  - [ ]* 2.6 Write property test: Persistence round trip (Property 4)
    - **Property 4: Persistence round trip**
    - For any valid UserOverrides, saving then loading produces a structurally equivalent object
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 2.7 Write property test: Corrupted data fallback (Property 5)
    - **Property 5: Corrupted data fallback**
    - For any arbitrary string that is not valid UserOverrides JSON, `loadOverrides` returns empty overrides
    - **Validates: Requirements 4.3, 7.3**

  - [ ]* 2.8 Write property test: Reset restores defaults (Property 6)
    - **Property 6: Reset restores defaults**
    - After clearing overrides, the effective list equals DEFAULT_RESERVED_COMBINATIONS
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 2.9 Write property test: Serialization round trip (Property 8)
    - **Property 8: Serialization round trip**
    - For any valid UserOverrides, `serializeOverrides` then `deserializeOverrides` produces equivalent data
    - **Validates: Requirements 7.2**

- [x] 3. Checkpoint - Core domain logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrate with prompt selector
  - [x] 4.1 Update `src/domain/prompt-selector.ts` to use ReservedListManager
    - Import `loadOverrides`, `getEffectiveList`, `isReserved` from `reserved-list-manager`
    - Import `DEFAULT_RESERVED_COMBINATIONS` from `../data/default-reserved`
    - Modify `filterReserved` to compute effective list from overrides instead of calling `isOsReserved`
    - Ensure `getPromptsForCategory` and `getMixedPrompts` continue to work correctly
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 4.2 Write property test: Effective list exclusion from prompts (Property 7)
    - **Property 7: Effective list exclusion from prompts**
    - For all combinations in the effective reserved list, the prompt selector never includes them in returned prompts
    - **Validates: Requirements 6.3**

  - [ ]* 4.3 Write integration test for prompt selector with user overrides
    - Set overrides in localStorage, call `getPromptsForCategory`, verify user-added combos are excluded
    - Remove a default reserved combo, verify it can now appear in prompts
    - _Requirements: 6.1, 6.2_

- [x] 5. Checkpoint - Integration verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Build Reserved Settings UI page
  - [x] 6.1 Create `src/pages/ReservedSettingsPage.tsx` with list display
    - Display effective reserved list grouped by source (OS / Browser / User-added)
    - Show visual badge/tag distinguishing default vs user-added entries
    - Show count summary of total reserved combinations
    - Include remove button on each entry
    - _Requirements: 3.2, 3.3_

  - [x] 6.2 Add combination input form to ReservedSettingsPage
    - Implement "Add Combination" form using the key capture engine pattern (like CustomSetsPage)
    - Show duplicate notice when attempting to add an existing combination
    - Wire add action to `addCombination` + `saveOverrides` from reserved-list-manager
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 6.3 Add reset-to-defaults functionality to ReservedSettingsPage
    - Implement "Reset to Defaults" button with confirmation dialog
    - Wire reset action to `clearOverrides` from reserved-list-manager
    - Update displayed list after reset
    - _Requirements: 5.1, 5.2_

  - [x] 6.4 Add route and navigation for Reserved Settings page
    - Add `/settings/reserved` route in `src/App.tsx`
    - Add navigation link in Layout component or settings section
    - _Requirements: 2.3, 3.2_

- [x] 7. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The existing `os-reserved.ts` module is preserved for backward compatibility — existing imports will continue to work
- All property tests use `fast-check` with `{ numRuns: 100 }` minimum
- Test files go in `src/domain/__tests__/` following the existing naming convention (e.g., `reserved-list-add.property.test.ts`)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3"] },
    { "id": 6, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 7, "tasks": ["6.4"] }
  ]
}
```

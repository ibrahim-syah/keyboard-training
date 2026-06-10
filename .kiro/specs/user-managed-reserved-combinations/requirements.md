# Requirements Document

## Introduction

This feature expands the existing OS-reserved combinations list to also include browser-reserved shortcuts (such as Cmd+W, Cmd+T, Cmd+N) that cannot be reliably intercepted by a web application. Rather than attempting workarounds like capture phase listeners or beforeunload handlers, these combinations are excluded from exercises entirely. Additionally, users can customize the reserved list through the UI — adding or removing combinations — with changes persisted to localStorage.

## Glossary

- **Reserved_List_Manager**: The domain module responsible for maintaining the combined list of reserved key combinations (default + user customizations) and persisting user changes to localStorage.
- **Reserved_Combinations_UI**: The settings panel component that allows users to view, add, and remove combinations from the reserved list.
- **Default_Reserved_List**: The built-in set of OS-reserved and browser-reserved key combinations shipped with the application.
- **User_Overrides**: The user's customizations to the reserved list, stored as additions and removals relative to the Default_Reserved_List.
- **Prompt_Selector**: The existing domain module that selects key combination prompts for exercises and drills, filtering out reserved combinations.
- **Effective_Reserved_List**: The computed union of the Default_Reserved_List plus user-added combinations, minus user-removed combinations.
- **Key_Combination**: A data structure representing a modifier set (ctrl, alt, shift, meta) and a base key code.

## Requirements

### Requirement 1: Expanded Default Reserved List

**User Story:** As a user, I want browser-reserved shortcuts excluded from exercises by default, so that I am not prompted for combinations that would trigger unwanted browser actions like closing tabs.

#### Acceptance Criteria

1. THE Default_Reserved_List SHALL include macOS OS-level reserved combinations: Cmd+Tab, Cmd+Q, Cmd+Space, Cmd+H, Cmd+M, Ctrl+Up, Ctrl+Down, Ctrl+Left, Ctrl+Right.
2. THE Default_Reserved_List SHALL include browser-reserved combinations: Cmd+W, Cmd+T, Cmd+N, Cmd+L, Cmd+R, Cmd+Shift+T, Cmd+Shift+N, Cmd+Shift+W.
3. WHEN the application starts for the first time, THE Reserved_List_Manager SHALL use the Default_Reserved_List as the Effective_Reserved_List.

### Requirement 2: User Additions to Reserved List

**User Story:** As a user, I want to add custom combinations to the reserved list, so that I can exclude additional shortcuts that interfere with my environment.

#### Acceptance Criteria

1. WHEN a user adds a valid Key_Combination via the Reserved_Combinations_UI, THE Reserved_List_Manager SHALL include that combination in the Effective_Reserved_List.
2. WHEN a user adds a combination that already exists in the Effective_Reserved_List, THE Reserved_List_Manager SHALL reject the addition and display a duplicate notice.
3. THE Reserved_Combinations_UI SHALL allow the user to specify a Key_Combination by selecting modifier keys and a base key.

### Requirement 3: User Removals from Reserved List

**User Story:** As a user, I want to remove combinations from the reserved list (including defaults), so that I can practice shortcuts that I know will not interfere with my specific setup.

#### Acceptance Criteria

1. WHEN a user removes a combination from the Effective_Reserved_List via the Reserved_Combinations_UI, THE Reserved_List_Manager SHALL exclude that combination from the Effective_Reserved_List.
2. THE Reserved_Combinations_UI SHALL allow removal of both default and user-added combinations.
3. THE Reserved_Combinations_UI SHALL visually distinguish default combinations from user-added combinations.

### Requirement 4: Persistence of User Overrides

**User Story:** As a user, I want my reserved list customizations to persist across sessions, so that I do not have to reconfigure them each time I use the application.

#### Acceptance Criteria

1. WHEN a user adds or removes a combination, THE Reserved_List_Manager SHALL persist the User_Overrides to localStorage under the `mkt_` namespace.
2. WHEN the application loads, THE Reserved_List_Manager SHALL read User_Overrides from localStorage and compute the Effective_Reserved_List.
3. IF localStorage is unavailable or contains corrupted data, THEN THE Reserved_List_Manager SHALL fall back to the Default_Reserved_List without error.
4. THE Reserved_List_Manager SHALL store User_Overrides as a JSON structure containing an additions array and a removals array.

### Requirement 5: Reset to Defaults

**User Story:** As a user, I want to reset the reserved list to defaults, so that I can undo all my customizations in one action.

#### Acceptance Criteria

1. WHEN the user activates the reset action in the Reserved_Combinations_UI, THE Reserved_List_Manager SHALL clear all User_Overrides from localStorage.
2. WHEN User_Overrides are cleared, THE Effective_Reserved_List SHALL equal the Default_Reserved_List.

### Requirement 6: Integration with Exercise Filtering

**User Story:** As a user, I want the reserved list changes to immediately affect which combinations appear in exercises, so that excluded combinations never appear as prompts.

#### Acceptance Criteria

1. THE Prompt_Selector SHALL use the Effective_Reserved_List when filtering combinations for exercises and drills.
2. WHEN the Effective_Reserved_List changes, THE Prompt_Selector SHALL reflect those changes on the next prompt selection without requiring an application restart.
3. FOR ALL combinations in the Effective_Reserved_List, THE Prompt_Selector SHALL exclude those combinations from exercise prompts.

### Requirement 7: Reserved List Serialization

**User Story:** As a developer, I want the reserved list User_Overrides to be serializable and deserializable, so that data integrity is maintained across save/load cycles.

#### Acceptance Criteria

1. THE Reserved_List_Manager SHALL serialize User_Overrides to a JSON format containing additions and removals arrays of Key_Combination objects.
2. FOR ALL valid User_Overrides, serializing then deserializing SHALL produce an equivalent User_Overrides object (round-trip property).
3. IF the deserialized data does not conform to the expected schema, THEN THE Reserved_List_Manager SHALL discard the data and use an empty User_Overrides.

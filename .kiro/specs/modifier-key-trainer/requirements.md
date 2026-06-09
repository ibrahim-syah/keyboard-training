# Requirements Document

## Introduction

A web-based typing trainer application specifically designed for practicing modifier keys, number keys, function keys, and multi-key combinations on macOS. Unlike standard typing trainers that focus on letter-key touch typing, this application targets the non-letter keys and key combinations that are essential for efficient keyboard-driven workflows (shortcuts in IDEs, terminals, design tools, etc.). The app runs in the browser and uses `preventDefault` on keydown events to capture modifier key combinations that would otherwise trigger browser shortcuts.

## Glossary

- **Trainer**: The web application that presents key combination prompts and captures user input
- **Key_Prompt**: A visual display showing the user which key or key combination to press
- **Key_Capture_Engine**: The subsystem responsible for intercepting and identifying keyboard events via the browser's keydown API
- **Exercise**: A structured set of Key_Prompts that the user works through in sequence
- **Modifier_Key**: One of Cmd (⌘), Ctrl (⌃), Alt/Option (⌥), or Shift (⇧)
- **Combination**: Two or more keys pressed simultaneously, where at least one is a Modifier_Key
- **Drill_Mode**: A training mode where the user repeatedly practices a specific category of keys or combinations
- **Session**: A single continuous period of training activity from start to finish
- **Accuracy_Score**: The percentage of correct key presses out of total attempted key presses in a Session
- **Response_Time**: The elapsed time between a Key_Prompt being displayed and the user pressing the correct key or Combination
- **Progress_Tracker**: The subsystem that records and displays the user's historical performance data

## Requirements

### Requirement 1: Key Event Capture

**User Story:** As a user, I want the app to accurately detect modifier keys, number keys, function keys, and combinations I press, so that my input is correctly recognized during training.

#### Acceptance Criteria

1. WHEN a keydown event occurs, THE Key_Capture_Engine SHALL identify the exact set of keys currently held down, including all Modifier_Keys, by reading the ctrlKey, shiftKey, altKey, and metaKey properties along with the event.code value
2. WHEN a browser-interceptable key combination is pressed while an Exercise is active, THE Key_Capture_Engine SHALL call preventDefault to suppress the browser's default behavior; WHEN no Exercise is active, THE Key_Capture_Engine SHALL NOT call preventDefault
3. THE Key_Capture_Engine SHALL distinguish between left and right variants of Modifier_Keys by inspecting the event.code property (e.g., ShiftLeft vs ShiftRight, ControlLeft vs ControlRight) where the browser's KeyboardEvent API provides this information
4. IF a key combination is intercepted by the operating system before reaching the browser (e.g., Cmd+Q, Cmd+Tab), THEN THE Trainer SHALL display a notification indicating the combination is unavailable for practice; the notification SHALL remain visible for 3 seconds before auto-dismissing
5. WHEN a keydown event occurs, THE Key_Capture_Engine SHALL identify the key within 16 milliseconds of the browser dispatching the event
6. WHEN the Key_Capture_Engine receives a keydown event with event.repeat set to true, THE Key_Capture_Engine SHALL ignore that event and not treat it as a new key press
7. THE Key_Capture_Engine SHALL track keyup events to determine when all keys in a Combination have been pressed and released, marking the Combination as complete only when the final non-modifier key is pressed while all required Modifier_Keys are held down

### Requirement 2: Key Categories and Exercise Content

**User Story:** As a user, I want exercises organized by key category, so that I can focus my practice on specific areas of weakness.

#### Acceptance Criteria

1. THE Trainer SHALL provide exercises for the following key categories: Modifier_Keys alone, number keys (0-9), function keys (F1-F12), navigation keys (Home, End, Page Up, Page Down, arrow keys), and Combinations
2. THE Trainer SHALL provide Combination exercises that include two-key Combinations (e.g., Cmd+C), three-key Combinations (e.g., Cmd+Shift+P), and four-key Combinations (e.g., Ctrl+Alt+Shift+F)
3. WHEN the user selects a key category, THE Trainer SHALL present only exercises from that category
4. THE Trainer SHALL provide a mixed-mode exercise that draws prompts from all key categories with equal probability per category
5. Each Exercise SHALL contain a minimum of 10 and a maximum of 50 Key_Prompts, configurable by the user before starting the exercise
6. THE Trainer SHALL provide at least 15 distinct Key_Prompts per key category to avoid excessive repetition within a single Exercise

### Requirement 3: Exercise Prompt Display

**User Story:** As a user, I want clear visual prompts showing which keys to press, so that I can quickly understand the target combination.

#### Acceptance Criteria

1. WHEN an Exercise begins, THE Trainer SHALL display a Key_Prompt showing the target key or Combination using macOS-standard symbols (⌘, ⌃, ⌥, ⇧) with a minimum font size of 24 pixels
2. THE Trainer SHALL display Modifier_Keys in Combinations in a consistent left-to-right order: Ctrl (⌃) → Alt/Option (⌥) → Shift (⇧) → Cmd (⌘) → base key
3. WHEN the user presses the correct key or Combination, THE Trainer SHALL display visual feedback indicating success within 100 milliseconds, and THE Trainer SHALL display the next Key_Prompt after a delay of 500 to 1000 milliseconds
4. WHEN the user presses an incorrect key or Combination, THE Trainer SHALL display visual feedback indicating the error within 100 milliseconds, show which keys were actually pressed using the same macOS-standard symbols, and continue displaying the same Key_Prompt until the user presses the correct key or Combination
5. WHEN a Key_Prompt is displayed, THE Trainer SHALL highlight the corresponding keys on a visual keyboard layout representation
6. IF the user does not press any key within 10 seconds of a Key_Prompt being displayed, THEN THE Trainer SHALL visually pulse the keyboard layout highlight to re-attract the user's attention

### Requirement 4: Drill Mode Training

**User Story:** As a user, I want a drill mode that repeatedly presents combinations I struggle with, so that I can build muscle memory for difficult key presses.

#### Acceptance Criteria

1. WHEN the user activates Drill_Mode, THE Trainer SHALL present a continuous sequence of Key_Prompts from the selected category until the user exits the session
2. WHILE in Drill_Mode, THE Trainer SHALL increase the frequency of Combinations that the user has previously answered incorrectly or with a Response_Time exceeding 3 seconds, such that these Combinations appear at least twice as often as Combinations answered correctly within 3 seconds
3. IF the user activates Drill_Mode with no prior Session history for the selected category, THEN THE Trainer SHALL present Combinations in uniform random order until at least 10 responses have been recorded, after which adaptive frequency weighting SHALL begin
4. WHILE in Drill_Mode, THE Trainer SHALL track the Accuracy_Score and Response_Time for each Key_Prompt
5. WHEN the user completes a Drill_Mode session, THE Trainer SHALL display a summary showing Accuracy_Score, average Response_Time, and up to three most-missed Combinations based on highest error count
6. WHILE in Drill_Mode, THE Trainer SHALL allow the user to exit at any time by pressing Escape twice in quick succession (within 500 milliseconds)

### Requirement 5: Progress Tracking and Statistics

**User Story:** As a user, I want to see my improvement over time, so that I can stay motivated and identify areas that need more practice.

#### Acceptance Criteria

1. THE Progress_Tracker SHALL persist Session results in browser local storage, storing for each Session: date/time, key category, Accuracy_Score, average Response_Time, number of prompts attempted, and per-Combination accuracy data
2. WHEN the user navigates to the progress view, THE Progress_Tracker SHALL display accuracy and speed trends over the last 30 days as a line chart with one data point per Session
3. THE Progress_Tracker SHALL identify and display the user's 5 weakest Combinations, ranked by lowest Accuracy_Score; ties SHALL be broken by slowest average Response_Time
4. WHEN the user has completed at least five Sessions, THE Progress_Tracker SHALL display an overall proficiency rating per key category using a 5-star scale (1 star = below 50% accuracy, 5 stars = above 95% accuracy with average Response_Time below 1 second)
5. IF local storage is unavailable or full, THEN THE Progress_Tracker SHALL display an inline notification stating "Progress cannot be saved — storage unavailable" and allow training to continue without persistence
6. IF fewer than 5 Sessions have been completed, THEN THE Progress_Tracker SHALL display a message indicating how many more Sessions are needed before proficiency ratings become available

### Requirement 6: Customizable Training Sets

**User Story:** As a user, I want to create custom training sets with specific key combinations relevant to my workflow, so that I can practice the exact shortcuts I use daily.

#### Acceptance Criteria

1. WHEN the user opens the custom training editor, THE Trainer SHALL allow the user to record Combinations by pressing them on the keyboard, displaying each recorded Combination in a list as it is captured
2. THE Trainer SHALL allow the user to save custom training sets with a user-provided name between 1 and 50 characters; names SHALL be trimmed of leading/trailing whitespace
3. THE Trainer SHALL allow the user to import custom training sets from JSON files and export existing training sets as JSON files; IF an imported JSON file is malformed or contains invalid key codes, THEN THE Trainer SHALL display an error message identifying the issue and reject the import
4. WHEN the user selects a custom training set, THE Trainer SHALL use that set as the Exercise content in Drill_Mode
5. THE Trainer SHALL provide preset training sets for the following application shortcut groups: VS Code shortcuts, macOS Terminal shortcuts, and Figma shortcuts
6. A custom training set SHALL contain a minimum of 5 and a maximum of 200 Combinations; THE Trainer SHALL prevent saving if the set is outside these bounds and display the applicable limit
7. THE Trainer SHALL allow the user to edit an existing custom training set by adding or removing Combinations, and to delete a custom training set entirely with a confirmation prompt

### Requirement 7: Difficulty Progression

**User Story:** As a user, I want the difficulty to increase gradually, so that I can build skills incrementally without being overwhelmed.

#### Acceptance Criteria

1. WHEN the user begins training in a new category, THE Trainer SHALL present at least 10 single-key prompts before introducing Combinations for that category
2. THE Trainer SHALL organize Combination difficulty into levels: Level 1 (two-key Combinations using Cmd or Shift), Level 2 (two-key Combinations using Ctrl or Alt/Option), Level 3 (three-key Combinations), Level 4 (four-key Combinations)
3. WHEN the user achieves an Accuracy_Score above 90% and average Response_Time below 1 second across a minimum of 20 attempts for a given level within a category, THE Trainer SHALL unlock the next difficulty level for that category
4. IF the user has not met the progression criteria for the current level, THEN THE Trainer SHALL keep the next level locked and continue presenting prompts from the current and previously unlocked levels
5. THE Trainer SHALL allow the user to manually override difficulty progression and access any level directly regardless of Accuracy_Score or Response_Time

### Requirement 8: macOS Key Awareness

**User Story:** As a user on macOS, I want the app to understand macOS-specific key behavior, so that my training reflects real-world usage on my operating system.

#### Acceptance Criteria

1. THE Trainer SHALL map keyboard events to macOS key names (Cmd for Meta, Option for Alt) in all user-facing displays
2. THE Trainer SHALL maintain a hardcoded list of OS-reserved Combinations that cannot be captured in a web browser, including at minimum: Cmd+Tab, Cmd+Q, Cmd+Space, Cmd+H, Cmd+M, Ctrl+Up, Ctrl+Down, and Ctrl+Left/Right (Mission Control and Spaces navigation)
3. WHEN a Key_Prompt for an OS-reserved Combination appears in an Exercise or Drill_Mode (e.g., from a custom training set), THE Trainer SHALL skip that prompt and display a brief inline notice stating the Combination is reserved by macOS, then automatically advance to the next Key_Prompt after 2 seconds
4. THE Trainer SHALL detect whether the user's browser reports a macOS user agent; IF a non-macOS platform is detected, THEN THE Trainer SHALL display a notice that key mappings are optimized for macOS and behavior on other platforms may differ
5. THE Trainer SHALL display the Globe/Fn key symbol in Key_Prompts where the target involves function keys (F1-F12), indicating that the user may need to hold the Fn/Globe key depending on their macOS system preferences

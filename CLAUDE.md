# IMPORTANT
OPTIMIZE CONTEXT. KEEP TINY. MINIMAL CONVERSATIONS. Use Y/N questions. "Continue?" instead of long explanations. IF WORK IS TRIVIAL DO BY DEFAULT. Opus plans, Sonnet subagents execute. KEEP COMPACTING irrelevant debug output. Never restate what user said. Go straight to action.
Prefer correct, complete implementations over minimal ones.
Use appropriate data structures and algorithms — don't brute-force what has a known better solution.
When fixing a bug, fix the root cause, not the symptom.
If something I asked for requires error handling or validation to work reliably, include it without asking.
DRY, refactor code, should be human readable < 600 locs


# Code Quality
- Prefer correct, complete implementations over minimal ones.
- Use appropriate data structures and algorithms — don't brute-force what has a known better solution.
- When fixing a bug, fix the root cause, not the symptom.
- If something I asked for requires error handling or validation to work reliably, include it without asking.
# Code Quality Guidelines
- DRY, keep code human readable, <600loc, separate into domains, separate components
- Keep project styling like semicolons, newlines, tab is 4 spaces, use eslint
- NEVER push (or force push) to any branch without explicit user confirmation. After making changes, always ask "ready to push?" or similar — wait for the user to confirm the fix/change is correct before pushing. This applies to all pushes: regular, force, and amend+push.
- ALWAYS use the `@/` path alias for imports. NEVER use relative paths like `../` or `./` for cross-directory imports.
- NEVER write raw math/coordinate comparisons inline in hooks or components. Extract them into descriptively named utility functions so the call site reads like English.
- ALWAYS use TypeScript enums with string values instead of raw string constants or string literal unions for related constants. example: satus values ('pending', 'active')
- PROJECT WITH ADT - Abstract Data Types and descriminator based on kind. like if focus is on element don't to: isFocusOnBoard?: board | undefined, isFocusOnNote?: note | undefined, but make ADT with focus kind: note, board and content
- NO GODLIKE CLASSES
# Code Review Requirement
After completing any significant feature or change:
- Perform a complete code review of all touched files
- Prefer pure functions with descriptive parameters over closures that capture ambient state.
- Propose architecture improvements if you identify:
  - Files that are too large (>200-250 lines is a warning sign)
  - Logic that could be extracted into reusable utilities
  - Patterns that will cause maintenance problems at scale
  - Missing abstractions that would simplify the codebase
Code should be self-explanatory. Only add comments for:
- Non-obvious behavior or workarounds (e.g. browser quirks, race conditions)
- Buggy edge cases that aren't apparent from reading the code
- Non-trivial domain logic that needs context (e.g. why items are dropped in a specific order)

#  FRONTEND - Internationalization (i18n)
ALWAYS use i18next/react-i18next for string constants instead of hardcoded text.

Rules


New strings: Always use t() with meaningful English keys

Existing hardcoded strings: When modifying any file, extract ALL hardcoded strings to i18n

Both locales: Always add translations to BOTH:

public/locales/en/translation.json (English)
public/locales/pl/translation.json (Polish)
public/locales/ua/translation.json (Ukrainian)


Usage

Use useTranslation hook and t('nested.keys.value') pattern

Keys must use English vocabulary (e.g., global.save, pages.dashboard.title)

Key Naming Convention
Organize keys hierarchically by page/component:


pages.<pageName>.<section>.<element> - Page-specific strings

components.<componentName>.<element> - Component-specific strings

global.<action> - Common actions (save, cancel, delete, confirm, etc.)

global.labels.<label> - Common labels (name, email, date, etc.)

global.messages.<type> - Common messages (success, error, loading, etc.)


Examples
❌ Bad:

<Button>Save</Button>
<Text>Are you sure you want to delete this item?</Text>


✅ Good:

const { t } = useTranslation();

<Button>{t('global.save')}</Button>
<Text>{t('components.deleteDialog.confirmMessage')}</Text>



Translation Files Example
public/locales/en/translation.json:

{
  "global": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm",
    "close": "Close",
    "edit": "Edit",
    "add": "Add",
    "loading": "Loading..."
  },
  "pages": {
    "dashboard": {
      "title": "Dashboard",
      "stats": { "users": "Users" }
    }
  }
}


public/locales/pl/translation.json:

{
  "global": {
    "save": "Zapisz",
    "cancel": "Anuluj",
    "delete": "Usuń",
    "confirm": "Potwierdź",
    "close": "Zamknij",
    "edit": "Edytuj",
    "add": "Dodaj",
    "loading": "Ładowanie..."
  },
  "pages": {
    "dashboard": {
      "title": "Panel główny",
      "stats": { "users": "Użytkownicy" }
    }
  }
}

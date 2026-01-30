# Repository Guidelines

## Project Structure & Module Organization
The Vite + Vue 3 frontend lives under `src/`: `components/`, `composables/` (hooks like `useMusic`), `services/`, and `utils/`. Static assets and the icon source stay in `public/`, which feeds `scripts/generate-icons.js`. Cloudflare Worker routing, middleware, and the Durable Object implementation sit in `workers/` with `wrangler.toml`. Production artifacts are written to `dist/`.

## Build, Test, and Development Commands
- `bun install` — install dependencies.
- `bun run dev` — start the Vite dev server on http://localhost:5173.
- `bun run generate-icons` — rebuild PWA icons from `public/icon-source.png`.
- `bun run build` — produce the optimized bundle and copy assets into `dist/`.
- `bun run preview` — serve the built bundle locally.
- `bun run dev:worker` — rebuild and run `wrangler dev --local` for the Hono worker and `OnlineCounter`.
- `bun run deploy:worker` — publish via Wrangler; ensure bindings and secrets are correct.
- `bun run lint` — run ESLint and auto-fix issues.
- `bun run format` — format code with Prettier.
- **Always run `bun run lint` before committing to ensure code quality.**

## Coding Style & Naming Conventions
Use ES modules with single quotes and two-space indentation. Components stay PascalCase (`PomodoroTimer.vue`) and export default; composables and utilities use camelCase file names. Keep `<script setup>` blocks lean, share helpers through `utils/`, and favor descriptive refs (`currentVideo`, `aplayerInitialized`). Base styles live in `src/style.css`; scope component styles only when needed.

### Icon Usage Guidelines
**Always use Iconify** (`@iconify/vue`) for icons instead of Unicode emoji or hardcoded SVG. This ensures visual consistency, PWA offline support, and easier maintenance.

- **Import**: Add `import { Icon } from '@iconify/vue'` in `<script setup>`.
- **Icon sets**: Prefer MDI (`mdi:*`), Lucide (`lucide:*`), or Phosphor (`ph:*`) for consistency.
- **Example**: `<Icon icon="mdi:play" />` or `<Icon icon="lucide:settings" width="20" height="20" />`.
- **Never use**: Raw emoji (🎵, ⚙️, 📊) or inline `<svg>` tags for UI icons.
- **Exception**: Functional SVG components (like progress rings) are allowed if they require dynamic rendering.

When adding new UI elements with icons, choose appropriate Iconify icons that match the existing design language.

### JSDoc Documentation
**All modules and exports must have JSDoc comments.** Use `@module` for files, `@param`/`@returns` for functions, `@typedef` for complex types.

### Constants Management
**All constants must be centralized** — never hardcode magic strings or numbers in components or utilities.

| Constant Type | Location | Examples |
|---------------|----------|----------|
| Global constants | `src/config/constants.js` | Cache names, API config, localStorage keys, reconnect strategies |
| Module-specific | Module's `constants.js` | `src/composables/focus/constants.js` (state enums, defaults) |

**Rules:**
- **No hardcoding**: Import constants from the appropriate constants file
- **Unified prefix**: localStorage keys use `swm_` prefix, defined in `STORAGE_KEYS`
- **Naming**: Use UPPER_SNAKE_CASE for all constants

```javascript
// ❌ Wrong: hardcoded
localStorage.getItem('pomodoro_duration')

// ✅ Correct: use constants
import { STORAGE_KEYS } from 'src/config/constants'
localStorage.getItem(STORAGE_KEYS.POMODORO_DURATION)
```

### UI Target
**Desktop landscape only** — no mobile portrait UI support needed. All layouts assume horizontal orientation; no responsive breakpoints for portrait mode.

## Testing Guidelines
The project uses **Vitest** for unit/integration tests and **Playwright** for E2E tests.

### Test Commands
- `bun run test` — run all unit and integration tests.
- `bun run test:watch` — run tests in watch mode during development.
- `bun run test:coverage` — generate coverage report (target: 60% lines/functions, 50% branches).
- `bun run test:e2e` — run Playwright E2E tests.
- `bun run test:e2e:ui` — run E2E tests with interactive UI.
- `bun run test:all` — run both unit and E2E tests.

### Test Structure
```
tests/
├── setup/
│   ├── vitest.setup.js      # Global mocks (localStorage, OPFS, Cache API, etc.)
│   └── fixtures/            # Test data (songs.js, playlists.js, focusRecords.js)
├── unit/
│   ├── services/            # Service layer tests
│   ├── composables/         # Vue composables tests
│   │   └── focus/           # Focus module tests (useTimer, useRecords, useSession, useStats)
│   └── utils/               # Utility function tests
├── integration/             # Integration tests (playlist flow, cache flow)
└── e2e/                     # E2E smoke tests
```

### Writing Tests
- Use dynamic imports for singleton composables: `const { useMusic } = await import('@/composables/useMusic.js')`
- Call `vi.resetModules()` in `beforeEach` to reset module state between tests
- Use `vi.useFakeTimers()` for testing throttled/debounced functions
- Test files follow the pattern `*.spec.js`

### Before Committing
Always run `bun run test` to ensure all tests pass before committing.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat: add pomodoro presets`, `fix(worker): guard ws cors`) and keep each change scoped. Use GitHub Flow: branch from `main`, push frequently, and open a PR once manual tests pass. PR descriptions should state the motivation, include test evidence (commands and screenshots for UI work), and link related issues or migrations that must run after merge.

## Deployment & Configuration Tips
`wrangler.toml` defines the `OnlineCounter` Durable Object and binds assets through the `ASSETS` namespace. Increment migration tags sequentially and keep prior tags intact. Before deploying, verify `wrangler whoami`, configure secrets outside git, and confirm `dist/` was freshly built because the worker serves those files for unknown routes.

## Focus Module (Pomodoro System)

The `useFocus` composable provides a complete pomodoro timer system with state machine, records storage, statistics, and data export.

### Architecture
```
src/composables/
├── useFocus.js              # Unified entry point (Facade)
└── focus/
    ├── constants.js         # Enums, defaults, storage keys
    ├── useTimer.js          # Pure timer (timestamp-based, handles background throttling)
    ├── useRecords.js        # CRUD + query methods
    ├── useSession.js        # State machine + interruption recovery
    └── useStats.js          # Statistics + heatmap data
```

### State Machine
```
IDLE ──start──▶ RUNNING ──complete──▶ IDLE
                   │
                   ├──pause──▶ PAUSED ──resume──▶ RUNNING
                   ├──cancel──▶ IDLE (cancelled)
                   └──skip──▶ IDLE (skipped, advances to next phase)
```

### Basic Usage
```javascript
import { useFocus } from '@/composables/useFocus.js'

const {
  // State
  state, mode, elapsed, remaining, progress,
  isRunning, isPaused, isIdle,

  // Actions
  start, pause, resume, cancel, skip,

  // Settings
  settings, updateSettings,

  // Statistics
  todayStats, weekStats, getHeatmapData,

  // Records
  records, queryRecords, clearRecords,

  // Export
  exportData
} = useFocus()

// Start a focus session
start()

// Export records as JSON
exportData('json', { includeStats: true })
```

### Storage Keys
- `swm_focus_records` - Session records array
- `swm_focus_settings` - User settings
- `swm_focus_current` - Runtime state (for interruption recovery)


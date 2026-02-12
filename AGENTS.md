# Repository Guidelines

## Project Structure & Module Organization
- `src/`: Vue 3 frontend app code (`components/`, `composables/`, `services/`, `utils/`, `player/`, `styles/`).
- `workers/`: Cloudflare Worker backend (routes, middleware, services, schemas, DB access).
- `shared/`: Shared logic used by frontend and worker (for example CBOR utilities).
- `tests/`: Test suites split by scope:
  - `tests/unit/` for isolated modules/components.
  - `tests/integration/` for cross-module flows and API integration.
  - `tests/e2e/` for browser-level Playwright scenarios.
- `migrations/`: Drizzle/D1 migration files.
- `public/`: Static assets and icons.

## Build, Test, and Development Commands
- `bun run dev`: Start local Vite dev server.
- `bun run build`: Generate icons, build frontend, and copy static assets to `dist/`.
- `bun run preview`: Preview the production build locally.
- `bun run dev:worker`: Build then run Worker locally with Wrangler.
- `bun run test`: Run unit + integration (non-API) tests with Vitest.
- `bun run test:api`: Run API integration tests (`vitest.config.api.js`).
- `bun run test:e2e`: Run Playwright end-to-end tests.
- `bun run lint:check` / `bun run format:check`: Validate linting and formatting without edits.

## Coding Style & Naming Conventions
- Formatting is enforced by Prettier: 2-space indentation, single quotes, no semicolons, max line length 100.
- ESLint (`plugin:vue/vue3-recommended`) is required; fix issues with `bun run lint`.
- Vue components use `PascalCase` file names (for example `SettingsModal.vue`).
- Composables follow `useXxx.js` naming (for example `useAuth.js`).
- Keep modules focused and colocate feature-specific helpers under the nearest feature directory.

## Testing Guidelines
- Frameworks: Vitest (`happy-dom`) for unit/integration, Playwright for E2E.
- Test files must use `*.spec.js` and live under matching `tests/**` folders.
- Coverage thresholds (Vitest): `lines >= 60`, `functions >= 60`, `branches >= 50` for key frontend modules.
- Use `bun run test:coverage` before opening large refactors.

## Commit & Pull Request Guidelines
- Use Conventional Commits (validated by commitlint + Husky), e.g. `feat(auth): add WebAuthn login`.
- Allowed commit types include: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `build`.
- PRs should include:
  - Clear summary and scope.
  - Linked issue(s) when applicable.
  - Screenshots/GIFs for UI changes.
  - Test evidence (commands run and results).

## Security & Configuration Tips
- Copy `.env.example` to `.env` (or `.env.local`) and set `VITE_SITE_URL` for deployment context.
- Use `wrangler.toml.example` as the baseline for Worker/D1 bindings; keep secrets and environment-specific IDs out of version control.

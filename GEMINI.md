# Study With Miku - Project Context

## Project Overview

**Study With Miku** is a Pomodoro timer web application with a "Study with Miku" theme. It features a Vue.js frontend and a Cloudflare Workers backend, enabling features like online user counting, data synchronization, and music playback.

### Key Technologies

*   **Frontend:**
    *   **Framework:** Vue 3
    *   **Build Tool:** Vite
    *   **Styling:** SCSS (Sass)
    *   **PWA:** Enabled (via `vite-plugin-pwa` and custom Service Worker logic)
    *   **Audio:** APlayer
*   **Backend:**
    *   **Runtime:** Cloudflare Workers
    *   **Framework:** Hono.js
    *   **Database:** Cloudflare D1 (SQLite) managed via Drizzle ORM
    *   **State Management:** Cloudflare Durable Objects (used for `OnlineCounter` and `AuthChallenge`)
    *   **Authentication:** WebAuthn (Passkeys) & OAuth
*   **Package Manager:** Bun (implied by scripts in `package.json`)
*   **Testing:**
    *   **Unit/Integration:** Vitest
    *   **E2E:** Playwright

## Project Structure

```text
/home/frez79/StudyWithMiku/
├── src/                    # Frontend (Vue.js) Source
│   ├── components/         # Vue Components
│   ├── composables/        # Vue Composables (logic reuse)
│   ├── services/           # Frontend Services (API, Storage, Sync)
│   ├── styles/             # Global SCSS styles
│   ├── utils/              # Utility functions
│   ├── App.vue             # Main Application Component
│   └── main.js             # Frontend Entry Point (PWA reg, migrations)
├── workers/                # Backend (Cloudflare Workers) Source
│   ├── db/                 # Drizzle ORM Schema and Config
│   ├── middleware/         # Hono Middleware (CORS, Security)
│   ├── routes/             # API Routes (Auth, Data, OAuth)
│   ├── services/           # Backend Business Logic
│   ├── auth-challenge.js   # Durable Object: Auth Challenge
│   ├── online-counter.js   # Durable Object: Online Counter
│   └── index.js            # Backend Entry Point (Hono App)
├── migrations/             # Database Migrations (Drizzle Kit)
├── tests/                  # Test Suite
│   ├── e2e/                # Playwright End-to-End Tests
│   ├── integration/        # Integration Tests
│   └── unit/               # Unit Tests
├── scripts/                # Helper Scripts (e.g., icon generation)
├── public/                 # Static Assets
└── [Config Files]          # vite.config.js, wrangler.toml, drizzle.config.js, etc.
```

## Development Workflow

### Prerequisites

*   **Bun:** The project uses `bun` for script execution.
*   **Node.js:** Required for some tooling.

### Installation

```bash
bun install
```

### Running the Project

*   **Frontend Development Server:**
    ```bash
    bun run dev
    ```
    Starts the Vite dev server.

*   **Backend Development Server:**
    ```bash
    bun run dev:worker
    ```
    Builds the worker and starts it locally using `wrangler dev --local`.

### Building

*   **Full Build:**
    ```bash
    bun run build
    ```
    This runs icon generation, builds the Vue app, and copies assets to `dist/`.

### Database Management

The project uses Drizzle ORM with Cloudflare D1.

*   **Generate Migrations:**
    ```bash
    bun run db:generate
    ```
*   **Push Schema to DB:**
    ```bash
    bun run db:push
    ```
*   **Open Drizzle Studio:**
    ```bash
    bun run db:studio
    ```

### Testing

*   **Unit Tests:**
    ```bash
    bun run test
    ```
*   **API Integration Tests:**
    ```bash
    bun run test:api
    ```
*   **End-to-End (E2E) Tests:**
    ```bash
    bun run test:e2e
    ```
*   **Run All Tests:**
    ```bash
    bun run test:all
    ```

## Coding Conventions

*   **Linting:** ESLint is used for JavaScript and Vue files.
*   **Formatting:** Prettier is used for code formatting.
*   **Commit Messages:** The project enforces Conventional Commits (via `commitlint` and `husky`).
*   **Style:** SCSS is used for styling. `common.scss` contains global styles.
*   **Architecture:**
    *   **Frontend:** Logic is separated into `composables` and `services`. Components should focus on UI.
    *   **Backend:** Routes are modularized in `workers/routes/`. Business logic should reside in `workers/services/`.
    *   **Database:** Schema definitions are in `workers/db/schema.js`.

## Deployment

*   **Worker Deployment:**
    ```bash
    bun run deploy:worker
    ```
    Deploys the backend to Cloudflare Workers using `wrangler deploy`.

## Additional Notes

*   **PWA:** The app is designed as a PWA. `src/utils/pwaDetector.js` and `src/utils/swCallback.js` handle PWA-specific logic.
*   **Environment Variables:** Check `wrangler.toml.example` for required backend environment variables. Frontend env vars likely follow Vite's `VITE_` prefix convention (check `.env.example` if it exists).

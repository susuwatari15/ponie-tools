# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Ponie Tools** — a Next.js App Router app hosting internal developer utilities, deployed on Vercel (`https://ponie-tools.vercel.app`). The home page (`/`) links to six tools, grouped the same way in the sidebar (`TOOL_NAV_GROUPS` in `src/components/layout/constants/nav-items.ts`):

API tools
- **Swagger Minifier** (`/minifier`) — trim an OpenAPI spec to selected endpoints. The route is `src/app/minifier/page.tsx`; the feature code lives in `src/app/_swagger-minifier/` (`components/`, `hooks/`, `lib/`).
- **Swagger Compare** (`/swagger-compare`) — diff saved snapshots, live fetches or pasted specs.
- **Permission Diff** (`/permission-diff`) — compare permission sets across role groups.

Utilities
- **PX ↔ REM** (`/px-to-rem`) — convert pixels and rem units.
- **Epoch Converter** (`/epoch-converter`) — convert Unix timestamps and dates.
- **JSON Formatter** (`/json-formatter`) — beautify, minify, validate and explore JSON.

A companion unpacked **Chrome extension** (`extension/`) fetches auth-gated Swagger JSON using the user's browser session and bridges it to the web page via `postMessage`. See `docs/plans/chrome-extension/` and `src/lib/swaggerExtensionBridge.ts`.

## Stack

React 19 · TypeScript (strict) · Next.js 16 (App Router, Turbopack) · Tailwind CSS 3 (dark mode `class` strategy) · React Hook Form + Zod · Lucide icons · **pnpm**.

## Commands

```bash
pnpm dev      # dev server (Turbopack)
pnpm build    # production build
pnpm start    # serve production build
pnpm lint     # eslint src/
pnpm format   # prettier --write .
pnpm format:check   # prettier --check . (no writes)
pnpm test     # vitest run (unit tests)
pnpm test:watch     # vitest in watch mode
pnpm test:coverage  # v8 coverage report in coverage/
pnpm analyze        # bundle reports in .next/analyze/ (webpack build); analyze:turbo for Turbopack's analyzer
```

Unit tests use Vitest (`vitest.config.mts`, node environment, `@/*` alias). Tests sit next to the module as `*.test.ts` and cover pure logic only (`src/lib/`, `src/app/*/_lib/`); shared spec fixtures live in `src/lib/__fixtures__/` (load them with `loadFixture` / `readFixture`). Verify changes with `pnpm lint`, `pnpm test` and `pnpm build` — CI (`.github/workflows/ci.yml`) runs the same three.

Formatting is Prettier (`.prettierrc`: tabs, double quotes, semicolons, `printWidth` 100; JSON/Markdown/YAML use 2 spaces). `eslint-config-prettier` turns off ESLint rules that would conflict. `.prettierignore` skips `docs/`, `extension/` (its own 2-space style) and lockfiles.

pnpm is pinned via `packageManager` in `package.json` (`pnpm-lock.yaml` is the only lockfile). If `pnpm` isn't on your PATH, use `corepack pnpm …`.

## Detailed rules (read these before editing)

These are the source of truth for conventions — keep them in sync when patterns change:

- `.github/copilot-instructions.md` — full architecture & code-style reference.
- `.github/instructions/react-components.instructions.md` — component/hook/prop patterns (`*.tsx`).
- `.github/instructions/styling.instructions.md` — Tailwind, dark mode, theme colors (`styles.ts`).
- `.github/instructions/new-feature.instructions.md` — scaffolding a new tool page.

## Essentials (quick reference)

- **Layout:** each tool is `src/app/<slug>/` with `page.tsx` (default export, `"use client"`), plus private folders `_components/`, `_hooks/`, `_lib/`, `_constants/` (Next.js excludes `_`-prefixed dirs from routing). Shared code in `src/components/`, `src/lib/`, `src/types/`, `src/constants/`.
- **Controller hook pattern:** each feature has `use<Feature>()` owning all state; the page passes it to children as the `m` prop.
- **Code style:** tabs for indentation, double quotes, always semicolons, `type` imports, `FC`-annotated components, named exports (default export only for `page.tsx`/`layout.tsx`/config). Path alias `@/*` → `src/*`.
- **Dark mode:** every color needs both light and dark variants. Theme-aware tokens `ink` / `surface` / `raised` / `line` / `fg` / `muted` / `accent` (CSS vars in `globals.css`, mapped in `tailwind.config.ts`) switch automatically; raw palette colors need explicit `dark:` variants. `pointer-coarse:` targets touch screens (≥ 40px hit areas).
- **Shared UI:** reuse `src/components/ui/` — `useCopy()` (clipboard + toast, over `src/lib/clipboard.ts`), `SegmentedControl` (view toggles and the narrow-screen pane tabs), `Skeleton`/`SkeletonGroup` (while IndexedDB hydrates), `Spinner` (in-flight work), `JsonTree`/`JsonView`. Long lists read `useDensity()` (`PreferencesProvider`) for the compact/comfortable preference.
- **Adding a tool:** follow `new-feature.instructions.md`, then register it in `src/components/layout/constants/nav-items.ts`.
- **Server-side work:** Next.js Route Handlers under `src/app/api/` (e.g. `api/fetch-swagger/route.ts`).
- **Persistence:** client-side via IndexedDB (`src/lib/indexedDb.ts` and the `*Storage.ts` wrappers), not localStorage. Exception: small per-viewer UI preferences (theme, density, sidebar, view toggles) use localStorage — see `src/constants/theme-storage.ts` / `preferences-storage.ts`.

## Git

Default branch `main`. Commit messages follow Conventional Commits (`feat:`, `refactor:`, …) — match existing history. Branch before committing; commit/push only when asked.

# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Ponie Tools** — a Next.js App Router app hosting internal developer utilities, deployed on Vercel (`https://ponie-tools.vercel.app`). Three tools:

- **Swagger Minifier** (`/minifier`, also the home page) — trim an OpenAPI spec to selected endpoints.
- **Swagger Compare** (`/swagger-compare`) — diff two saved spec snapshots.
- **Permission Diff** (`/permission-diff`) — compare permission sets across role groups.

A companion unpacked **Chrome extension** (`extension/`) fetches auth-gated Swagger JSON using the user's browser session and bridges it to the web page via `postMessage`. See `docs/plans/chrome-extension/` and `src/lib/swaggerExtensionBridge.ts`.

## Stack

React 19 · TypeScript (strict) · Next.js 16 (App Router, Turbopack) · Tailwind CSS 3 (dark mode `class` strategy) · React Hook Form + Zod · Lucide icons · **pnpm**.

## Commands

```bash
pnpm dev      # dev server (Turbopack)
pnpm build    # production build
pnpm start    # serve production build
pnpm lint     # eslint src/
```

There is no test suite. Verify changes with `pnpm lint` and `pnpm build`.

**Lockfile gotcha:** both `package-lock.json` and `pnpm-lock.yaml` are checked in, and the current `node_modules` is not a clean pnpm install — so `pnpm lint`/`pnpm build` may abort with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` (it wants to purge `node_modules`). To lint without reinstalling, run the binary directly: `./node_modules/.bin/eslint src/`. pnpm is still the intended package manager (see `vercel.json`).

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
- **Dark mode:** every color needs both light and dark variants. Custom theme colors `base` / `panel` / `panelSoft` / `accent` live in `tailwind.config.ts`.
- **Adding a tool:** follow `new-feature.instructions.md`, then register it in `src/components/layout/constants/nav-items.ts`.
- **Server-side work:** Next.js Route Handlers under `src/app/api/` (e.g. `api/fetch-swagger/route.ts`).
- **Persistence:** client-side via IndexedDB (`src/lib/indexedDb.ts` and the `*Storage.ts` wrappers), not localStorage.

## Git

Default branch `main`. Commit messages follow Conventional Commits (`feat:`, `refactor:`, …) — match existing history. Branch before committing; commit/push only when asked.

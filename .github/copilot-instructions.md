# Project Guidelines

## Overview

Ponie Tools — a Next.js App Router application with six developer tools, grouped in the sidebar and on the Home page (`TOOL_NAV_GROUPS` in `src/components/layout/constants/nav-items.ts`):

- **API tools** — Swagger Minifier (`/minifier`), Swagger Compare (`/swagger-compare`), Permission Diff (`/permission-diff`).
- **Utilities** — PX ↔ REM (`/px-to-rem`), Epoch Converter (`/epoch-converter`), JSON Formatter (`/json-formatter`).

Deployed on Vercel.

## Tech Stack

- React 19 + TypeScript (strict mode)
- Next.js 16 with App Router and Turbopack
- Tailwind CSS 3 (dark mode via `class` strategy)
- React Hook Form + Zod for form validation
- Lucide React for icons
- pnpm as package manager

## Architecture

Next.js App Router structure under `src/app/`:
- `layout.tsx` — Root layout: ThemeProvider → PreferencesProvider → ToastProvider → AppShell
- `page.tsx` — Home page (overview of every tool)
- `minifier/page.tsx` — Swagger Minifier route; its feature code lives in the private `_swagger-minifier/` folder (`components/`, `hooks/`, `lib/`) because it predates the per-route `_components/` layout
- `<route>/page.tsx` — Feature pages (default export, `"use client"` directive)
- `<route>/_components/` — Feature-specific UI components (private folder)
- `<route>/_hooks/` — Controller hooks (private folder)
- `<route>/_lib/` or `_constants/` — Utilities and constants scoped to feature
- `<route>/styles.ts` — Shared Tailwind class constants for the feature
- `<route>/types.ts` — Feature-specific type definitions
- `api/` — API route handlers (Next.js Route Handlers)

Private folders (prefixed with `_`) are excluded from routing by Next.js.

Shared code lives in:
- `src/components/layout/` — App shell (Header, Sidebar, Content, PageHeader, ThemeProvider, PreferencesProvider)
- `src/components/ui/` — Shared primitives (Button, Card, SegmentedControl, Skeleton, Spinner, JsonTree, ToastProvider + `useCopy`, …)
- `src/lib/` — Cross-feature utility functions
- `src/types/` — Shared TypeScript types
- `src/constants/` — Shared constants

Path alias: `@/*` maps to `./src/*`

## Code Style

- Use `type` imports (`import type { FC } from "react"`)
- Prefer `FC` type annotation for components
- Use named exports for components; use default exports for page components (`page.tsx`)
- Use tabs for indentation
- Double quotes for strings
- No semicolons omission — always use semicolons
- Formatting is enforced by Prettier (`.prettierrc`, `printWidth` 100); `eslint-config-prettier` disables conflicting lint rules

## Patterns

- **Client components**: Pages with interactivity use `"use client"` directive at the top
- **Controller hook pattern**: Each feature has a `use<Feature>()` hook that encapsulates all state and logic, returns a controller object passed to child components as `m` prop
- **Style constants**: Reusable Tailwind class strings exported from `styles.ts` (e.g. `themeClasses`, `panelClasses`, `mutedText`, `inputClasses`)
- **Dark mode**: Always provide both light and dark variants (e.g. `bg-white dark:bg-slate-900/80`)
- **Theme colors**: Prefer the theme-aware tokens `ink`, `surface`, `raised`, `line`, `fg`, `muted`, `accent` (CSS vars in `globals.css`, mapped in `tailwind.config.ts`) — they switch with the theme on their own
- **Clipboard**: Use `useCopy()` from `@/components/ui` (wraps `copyText` in `src/lib/clipboard.ts` and reports a toast); don't call `navigator.clipboard` directly
- **Loading states**: `Skeleton`/`SkeletonGroup` while IndexedDB hydrates; `Spinner` (or `EmptyState loading`) for in-flight fetches/compares
- **Narrow screens**: Two-pane tools render their panes as `SegmentedControl` tabs below `lg` (hide the inactive pane with `hidden lg:flex`); touch targets use the `pointer-coarse:` variant for ≥ 40px hit areas
- **Density**: Long lists read `useDensity()` (`"compact" | "comfortable"`, persisted by `PreferencesProvider`) to tighten padding and font size
- **Navigation**: Use `next/navigation` (`useRouter`, `useSearchParams`, `usePathname`)
- **API routes**: Use Next.js Route Handlers in `src/app/api/` for server-side logic

## Build & Dev

```bash
pnpm install        # install deps
pnpm dev            # start dev server (Turbopack)
pnpm build          # production build
pnpm start          # start production server
pnpm lint           # eslint
pnpm format         # prettier --write .
pnpm format:check   # prettier --check .
```

## Conventions

- Keep components focused — split into small, composable pieces
- Props interfaces defined inline or as exported types above the component
- Default exports only for `page.tsx`, `layout.tsx`, and config files
- Prefer `useMemo` / `useDeferredValue` for expensive computations
- Use `useState` with functional initializers for derived initial state
- Wrap components using `useSearchParams()` in `<Suspense>` boundaries

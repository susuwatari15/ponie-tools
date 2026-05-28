# Project Guidelines

## Overview

Ponie Tools — a Next.js App Router application with multiple developer utility pages (Swagger Minifier, Swagger Compare, Permission Diff). Deployed on Vercel.

## Tech Stack

- React 19 + TypeScript (strict mode)
- Next.js 16 with App Router and Turbopack
- Tailwind CSS 3 (dark mode via `class` strategy)
- React Hook Form + Zod for form validation
- Lucide React for icons
- pnpm as package manager

## Architecture

Next.js App Router structure under `src/app/`:
- `layout.tsx` — Root layout with ThemeProvider + AppShell
- `page.tsx` — Home page (Swagger Minifier)
- `<route>/page.tsx` — Feature pages (default export, `"use client"` directive)
- `<route>/_components/` — Feature-specific UI components (private folder)
- `<route>/_hooks/` — Controller hooks (private folder)
- `<route>/_lib/` or `_constants/` — Utilities and constants scoped to feature
- `<route>/styles.ts` — Shared Tailwind class constants for the feature
- `<route>/types.ts` — Feature-specific type definitions
- `api/` — API route handlers (Next.js Route Handlers)

Private folders (prefixed with `_`) are excluded from routing by Next.js.

Shared code lives in:
- `src/components/layout/` — App shell (Header, Sidebar, Content, PageHeader, ThemeProvider)
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

## Patterns

- **Client components**: Pages with interactivity use `"use client"` directive at the top
- **Controller hook pattern**: Each feature has a `use<Feature>()` hook that encapsulates all state and logic, returns a controller object passed to child components as `m` prop
- **Style constants**: Reusable Tailwind class strings exported from `styles.ts` (e.g. `themeClasses`, `panelClasses`, `mutedText`, `inputClasses`)
- **Dark mode**: Always provide both light and dark variants (e.g. `bg-white dark:bg-slate-900/80`)
- **Theme colors**: Use custom Tailwind colors — `base`, `panel`, `panelSoft`, `accent` (defined in tailwind.config.ts)
- **Navigation**: Use `next/navigation` (`useRouter`, `useSearchParams`, `usePathname`)
- **API routes**: Use Next.js Route Handlers in `src/app/api/` for server-side logic

## Build & Dev

```bash
pnpm install        # install deps
pnpm dev            # start dev server (Turbopack)
pnpm build          # production build
pnpm start          # start production server
pnpm lint           # eslint
```

## Conventions

- Keep components focused — split into small, composable pieces
- Props interfaces defined inline or as exported types above the component
- Default exports only for `page.tsx`, `layout.tsx`, and config files
- Prefer `useMemo` / `useDeferredValue` for expensive computations
- Use `useState` with functional initializers for derived initial state
- Wrap components using `useSearchParams()` in `<Suspense>` boundaries

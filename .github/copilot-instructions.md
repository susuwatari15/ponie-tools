# Project Guidelines

## Overview

Ponie Tools — a React SPA with multiple developer utility pages (Swagger Minifier, Swagger Compare, Permission Diff). Deployed on Vercel.

## Tech Stack

- React 18 + TypeScript (strict mode)
- Vite 5 (dev server on port 5174)
- Tailwind CSS 3 (dark mode via `class` strategy)
- React Router DOM 7 (nested routes)
- React Hook Form + Zod for form validation
- Lucide React for icons
- pnpm as package manager

## Architecture

Feature-based structure under `src/features/<feature-name>/`:
- `index.tsx` — Page component (exported, wired in `App.tsx` routes)
- `components/` — Feature-specific UI components
- `hooks/` — Controller hooks (return state + handlers as a single object)
- `styles.ts` — Shared Tailwind class constants for the feature
- `types.ts` — Feature-specific type definitions
- `lib/` or `constants/` — Utilities and constants scoped to feature

Shared code lives in:
- `src/components/layout/` — App shell (Header, Sidebar, Content, PageHeader)
- `src/utils/` — Cross-feature utility functions
- `src/types/` — Shared TypeScript types

## Code Style

- Use `type` imports (`import type { FC } from "react"`)
- Prefer `FC` type annotation for components
- Use named exports for components, barrel exports via `index.ts`
- Use tabs for indentation
- Double quotes for strings
- No semicolons omission — always use semicolons

## Patterns

- **Controller hook pattern**: Each feature has a `use<Feature>()` hook that encapsulates all state and logic, returns a controller object passed to child components as `m` prop
- **Style constants**: Reusable Tailwind class strings exported from `styles.ts` (e.g. `themeClasses`, `panelClasses`, `mutedText`, `inputClasses`)
- **Dark mode**: Always provide both light and dark variants (e.g. `bg-white dark:bg-slate-900/80`)
- **Theme colors**: Use custom Tailwind colors — `base`, `panel`, `panelSoft`, `accent` (defined in tailwind.config.ts)

## Build & Dev

```bash
pnpm install        # install deps
pnpm dev            # start dev server (port 5174)
pnpm build          # typecheck + production build
pnpm lint           # eslint
```

## Conventions

- Keep components focused — split into small, composable pieces
- Props interfaces defined inline or as exported types above the component
- No default exports except `App.tsx` and `vite.config.ts`
- Prefer `useMemo` / `useDeferredValue` for expensive computations
- Use `useState` with functional initializers for derived initial state

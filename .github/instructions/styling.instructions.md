---
description: "Use when writing Tailwind CSS classes, creating style constants, theming, or implementing dark mode. Covers the project's styling patterns and color system."
applyTo: "**/styles.ts"
---
# Tailwind Styling Guidelines

## Dark Mode

Always provide both light AND dark variants. Never leave a color without its dark counterpart:

```tsx
// Good
"bg-white dark:bg-slate-900/80"
"text-slate-900 dark:text-slate-100"
"border-slate-300 dark:border-slate-700/70"

// Bad — missing dark variant
"bg-white"
```

## Custom Theme Colors

Defined as CSS variables in `src/app/globals.css` (light on `:root`, dark on `html.dark`) and mapped in `tailwind.config.ts` (content scans `src/app/`, `src/components/`, `src/lib/`). They switch with the theme, so they need no `dark:` variant:

- `ink` — page background
- `surface` — cards/panels; `raised` — hover/raised areas
- `line` — borders and dividers
- `fg` — primary text; `muted` — secondary text (≥ 4.5:1 on `surface`/`raised` in both themes)
- `accent` — interactive blue
- `get` / `post` / `put` / `patch` / `del` — static HTTP-method / diff signal colors

## Style Constants Pattern

Each feature has a `styles.ts` that exports reusable Tailwind class strings:

```ts
export const themeClasses =
  "bg-slate-50/90 text-slate-900 dark:bg-slate-950/40 dark:text-slate-100";

export const panelClasses =
  "border-slate-300 bg-white shadow-sm dark:border-slate-700/70 dark:bg-slate-900/80";

export const mutedText = "text-slate-600 dark:text-slate-400";

export const inputClasses =
  "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500";
```

Import and compose these in components instead of repeating long class strings.

## Common Patterns

- Rounded corners: `rounded-md` or `rounded-lg`
- Transitions: `transition` on interactive elements
- Opacity backgrounds: use `/80`, `/90` suffixes for depth layering
- Focus rings: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50` (a global accent `:focus-visible` outline in `globals.css` is the fallback for anything without one)
- Touch targets: `pointer-coarse:min-h-10` (and `min-w-10` for icon buttons) — the variant is defined in `tailwind.config.ts`
- Hover states: pair with transition for smooth feedback

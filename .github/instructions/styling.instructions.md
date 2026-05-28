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

Defined in `tailwind.config.ts` — use these for brand-consistent styling:

- `base` (#070A14) — deepest background
- `panel` (#101A31) — card/panel backgrounds
- `panelSoft` (#16223F) — softer panel variant
- `accent` (#24A3FF) — primary blue accent

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
- Focus rings: `focus:outline-none focus:ring-2 focus:ring-accent/50`
- Hover states: pair with transition for smooth feedback

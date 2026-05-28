---
description: "Use when creating or modifying React components, TSX files, hooks, or feature modules. Covers component structure, hook patterns, and prop conventions."
applyTo: "**/*.tsx"
---
# React Component Guidelines

## Component Structure

```tsx
import type { FC } from "react";

type MyComponentProps = {
  m: SomeController;
  className?: string;
};

export const MyComponent: FC<MyComponentProps> = ({ m, className = "" }) => {
  return (
    <div className={`base-classes ${className}`}>
      {/* content */}
    </div>
  );
};
```

## Rules

- Always use `type` imports for types: `import type { FC } from "react"`
- Annotate components with `FC` type
- Use named exports for components; use default exports only for `page.tsx` and `layout.tsx`
- Props types defined inline above the component as `type` (not `interface`)
- Accept `className?: string` prop for composability
- Use tabs for indentation, double quotes for strings
- Use `@/*` path alias for imports from `src/`

## Client Components

Pages with interactivity must have `"use client"` at the top:

```tsx
"use client";

import type { FC } from "react";
// ...
```

Components using `useSearchParams()` must be wrapped in `<Suspense>` boundaries.

## Controller Hook Pattern

Each feature page has a controller hook that owns all state:

```tsx
// _hooks/useMyFeature.ts
export function useMyFeature() {
  const [value, setValue] = useState("");
  // ... all state and handlers
  return { value, setValue, /* ... */ };
}
export type MyFeatureController = ReturnType<typeof useMyFeature>;
```

Page component creates the controller and passes it as `m` prop:

```tsx
// page.tsx
"use client";

import type { FC } from "react";

const MyFeaturePage: FC = () => {
  const m = useMyFeature();
  return <MyFeatureView m={m} />;
};

export default MyFeaturePage;
```

Child components receive `m` (or destructured parts) as props:

```tsx
type Props = { m: MyFeatureController };
export const MyFeatureView: FC<Props> = ({ m }) => { /* ... */ };
```

## Imports Order

1. `"use client"` directive (if needed)
2. React / type imports
3. Next.js imports (`next/navigation`, `next/image`, etc.)
4. Third-party libraries
5. Shared components (`@/components/`)
6. Shared lib/types (`@/lib/`, `@/types/`)
7. Feature-local components (`./_components/`)
8. Feature hooks, styles, types, lib

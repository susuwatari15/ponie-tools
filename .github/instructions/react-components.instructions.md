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
- Use named exports — no default exports (except App.tsx)
- Props types defined inline above the component as `type` (not `interface`)
- Accept `className?: string` prop for composability
- Use tabs for indentation, double quotes for strings

## Controller Hook Pattern

Each feature page has a controller hook that owns all state:

```tsx
// hooks/useMyFeature.ts
export function useMyFeature() {
  const [value, setValue] = useState("");
  // ... all state and handlers
  return { value, setValue, /* ... */ };
}
export type MyFeatureController = ReturnType<typeof useMyFeature>;
```

Page component creates the controller and passes it as `m` prop:

```tsx
// index.tsx (page)
export const MyFeaturePage: FC = () => {
  const m = useMyFeature();
  return <MyFeatureView m={m} />;
};
```

Child components receive `m` (or destructured parts) as props:

```tsx
type Props = { m: MyFeatureController };
export const MyFeatureView: FC<Props> = ({ m }) => { /* ... */ };
```

## Imports Order

1. React / type imports
2. Third-party libraries
3. Shared components (`../../components/`)
4. Feature-local components (`./`)
5. Feature hooks, styles, types, lib

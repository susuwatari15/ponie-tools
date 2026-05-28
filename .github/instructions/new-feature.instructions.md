---
description: "Use when creating a new feature page, adding a new tool/utility to the app, or scaffolding a new feature module. Covers the full feature folder structure and wiring."
---
# New Feature Development

## Feature Folder Structure

```
src/features/<feature-name>/
├── index.tsx              # Page component (exported, add route in App.tsx)
├── styles.ts              # Tailwind class constants
├── types.ts               # Feature-specific types
├── components/            # Feature UI components
│   └── FeatureView.tsx
├── hooks/
│   └── use<Feature>.ts   # Controller hook
├── lib/                   # Feature utilities
└── constants/             # Feature constants/sample data
```

## Wiring Checklist

1. Create the feature folder under `src/features/<name>/`
2. Create `hooks/use<Feature>.ts` — controller hook with all state
3. Create `styles.ts` with `themeClasses`, `panelClasses`, `mutedText` at minimum
4. Create `types.ts` if the feature has domain types
5. Create components in `components/`
6. Create `index.tsx` that exports the page component (named export: `<Feature>Page`)
7. Add route in `src/App.tsx`
8. Add nav item in `src/components/layout/constants/nav-items.ts`

## Page Component Template

```tsx
import type { FC } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { use<Feature> } from "./hooks/use<Feature>";
import { themeClasses } from "./styles";

export const <Feature>Page: FC = () => {
  const m = use<Feature>();

  return (
    <div className={themeClasses}>
      <PageHeader title="Feature Name" subtitle="Description" />
      <FeatureView m={m} />
    </div>
  );
};
```

## Route Addition (App.tsx)

```tsx
import { <Feature>Page } from "./features/<feature-name>";
// Inside <Route element={<AppLayout />}>:
<Route path="<feature-slug>" element={<<Feature>Page />} />
```

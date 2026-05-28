---
description: "Use when creating a new feature page, adding a new tool/utility to the app, or scaffolding a new feature module. Covers the full feature folder structure and wiring."
---
# New Feature Development

## Feature Folder Structure

```
src/app/<feature-slug>/
├── page.tsx               # Page component (default export, "use client")
├── styles.ts              # Tailwind class constants
├── types.ts               # Feature-specific types
├── _components/           # Feature UI components (private folder)
│   └── FeatureView.tsx
├── _hooks/
│   └── use<Feature>.ts   # Controller hook
├── _lib/                  # Feature utilities
└── _constants/            # Feature constants/sample data
```

## Wiring Checklist

1. Create the feature folder under `src/app/<feature-slug>/`
2. Create `_hooks/use<Feature>.ts` — controller hook with all state
3. Create `styles.ts` with `themeClasses`, `panelClasses`, `mutedText` at minimum
4. Create `types.ts` if the feature has domain types
5. Create components in `_components/`
6. Create `page.tsx` with default export and `"use client"` directive
7. Add nav item in `src/components/layout/constants/nav-items.ts`

## Page Component Template

```tsx
"use client";

import type { FC } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { use<Feature> } from "./_hooks/use<Feature>";
import { themeClasses, panelClasses, mutedText } from "./styles";

const <Feature>Page: FC = () => {
  const m = use<Feature>();

  return (
    <div className={`w-full space-y-4 p-4 lg:p-4 ${themeClasses}`}>
      <PageHeader
        wrapperClassName={`rounded-xl border px-4 py-3 ${panelClasses}`}
        title="Feature Name"
        description="Description"
        titleClassName="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
        descriptionClassName={`text-sm ${mutedText}`}
      />
      <FeatureView m={m} />
    </div>
  );
};

export default <Feature>Page;
```

## Nav Item Addition

```ts
// src/components/layout/constants/nav-items.ts
import { IconName } from "lucide-react";

// Add to WORKSPACE_NAV_ITEMS array:
{ href: "/<feature-slug>", label: "Feature Name", icon: IconName },
```

## Notes

- Use private folders (`_components/`, `_hooks/`, `_lib/`, `_constants/`) — Next.js excludes these from routing
- Use `@/*` path alias for imports from `src/`
- Wrap components using `useSearchParams()` in `<Suspense>` boundaries
- Use Next.js Route Handlers in `src/app/api/` for any server-side logic

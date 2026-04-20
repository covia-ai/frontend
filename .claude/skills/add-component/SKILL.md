---
name: add-component
description: Scaffold a new React component following frontend conventions — shadcn/ui, Tailwind, functional style.
argument-hint: <ComponentName>
---

# Add Component

Create a new React component following the project's existing patterns.

## Steps

1. **Create the component file** at `src/components/<ComponentName>.tsx`

2. **Follow this pattern:**

```tsx
"use client";

import { Button } from "@/components/ui/button";

interface ComponentNameProps {
  // props
}

export const ComponentName = ({ ...props }: ComponentNameProps) => {
  return (
    <div>
      {/* Component content */}
    </div>
  );
};
```

3. **If the component needs venue data**, use the authenticated venue hook:
```tsx
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
```

4. **Add a test file** at `__tests__/<ComponentName>.test.tsx` if the component has non-trivial logic.

## Conventions

- Functional components with arrow function export (named, not default)
- `"use client"` directive on all components
- Props defined via TypeScript interface
- UI primitives from `@/components/ui/` (Button, Dialog, Card, etc.)
- Icons from `lucide-react` (primary) or `react-icons`
- Styling with Tailwind CSS utility classes — no CSS modules
- shadcn/ui components live in `src/components/ui/` — do not modify those directly

## Reference Components

- Simple component: `src/components/sign-in-button.tsx`
- With venue data: `src/components/AssetList.tsx`
- With dialog: `src/components/AddNewVenueModal.tsx`

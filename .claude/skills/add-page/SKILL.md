---
name: add-page
description: Scaffold a new Next.js App Router page following existing frontend conventions.
argument-hint: <route-path>
---

# Add Page

Scaffold a new page in the Next.js App Router.

## Steps

1. **Create the route directory** under `src/app/<route-path>/`

2. **Create `page.tsx`** following this pattern:

```tsx
"use client";

import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";

export default function PageName() {
  const venue = useAuthenticatedVenue();

  if (!venue) return null;

  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

3. **If the page needs its own layout**, create `layout.tsx` in the same directory.

## Conventions

- Always add `"use client"` directive — the app uses client-side rendering with Zustand
- Use `useAuthenticatedVenue()` for any page that calls venue APIs
- Use shadcn/ui components from `@/components/ui/` for UI elements
- Use Tailwind CSS utility classes for styling
- For route groups (no URL segment), use parentheses: `(group-name)/`

## Reference Pages

- Simple page: `src/app/(signup)/signUp/page.tsx`
- Auth callback: `src/app/auth/callback/page.tsx`
- Root layout: `src/app/layout.tsx`

---
name: new-page
description: Use this skill when creating any new page inside the dashboard. Triggers when asked to "create a page", "add a screen", "build the X page", "make a new view".
---

## Steps to create a new dashboard page

1. Create /app/(dashboard)/{route}/page.tsx as a Server Component
2. Create /app/(dashboard)/{route}/loading.tsx with matching Skeleton layout
3. Create /app/(dashboard)/{route}/error.tsx with error boundary
4. Add route to sidebar nav in /components/layout/Sidebar.tsx with correct role visibility
5. Add to breadcrumb config

## Mandatory page template
```tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PageName() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  
  // fetch data here — never use select *
  const { data } = await supabase
    .from('table_name')
    .select('id, column1, column2')
    .eq('organization_id', session.user.user_metadata.organization_id)
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Page Title
        </h1>
      </div>
    </div>
  )
}
```

## Mandatory loading.tsx template
```tsx
import { Skeleton } from '@/components/ui/skeleton'
export default function Loading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
```

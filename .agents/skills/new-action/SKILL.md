---
name: new-action
description: Use when creating a Next.js Server Action — any function that mutates data, processes a form, calls an external API, or runs business logic on the server.
---

## Mandatory server action template
Every action in /actions/ must follow this exact structure:
```typescript
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

// 1. Define Zod schema for input
const InputSchema = z.object({
  // define all fields
})

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string }

export async function actionName(
  input: z.infer<typeof InputSchema>
): Promise<ActionResult<ReturnType>> {
  
  // 2. Verify session FIRST
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: 'Unauthorized' }
  
  // 3. Validate input
  const parsed = InputSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.message }
  }
  
  try {
    // 4. Execute business logic using admin client
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('table_name')
      .insert({ ...parsed.data, organization_id: session.user.user_metadata.organization_id })
      .select('id')
      .single()
    
    if (error) throw error
    
    // 5. Write audit log
    await admin.from('audit_logs').insert({
      action_type: 'ACTION_NAME',
      entity_type: 'table_name',
      entity_id: data.id,
      performed_by: session.user.id,
      new_value: parsed.data,
    })
    
    // 6. Return typed success
    return { success: true, data }
    
  } catch (err) {
    console.error('actionName error:', err)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
```

Never throw errors — always return the typed result object.
Never use the admin client outside of server actions.

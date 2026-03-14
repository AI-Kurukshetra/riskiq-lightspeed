---
name: new-migration
description: Use when creating any Supabase database change — new table, new column, new index, new RLS policy, new function, or any schema modification.
---

## Steps to create a migration

1. Create file at: /supabase/migrations/{timestamp}_{description}.sql
   Timestamp format: YYYYMMDDHHMMSS
   Example: 20260310143000_create_applications_table.sql

2. Every migration file must contain IN THIS ORDER:
   a. CREATE TABLE with all columns
   b. CREATE INDEX on FK columns and status columns
   c. ALTER TABLE ENABLE ROW LEVEL SECURITY
   d. CREATE POLICY for each user role

3. After creating SQL file, remind user to run:
   `pnpm supabase db push`
   OR paste SQL directly in Supabase dashboard SQL editor

4. Update /types/index.ts with TypeScript interface for any new/modified table

## RLS policy template for org-scoped table
```sql
-- agents and users see only their org's data
CREATE POLICY "org_scoped_access" ON table_name
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- admins get full access within their org
CREATE POLICY "admin_full_access" ON table_name
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND organization_id = table_name.organization_id
    )
  );
```

## Standard columns every table should have
- id UUID DEFAULT gen_random_uuid() PRIMARY KEY
- organization_id UUID NOT NULL REFERENCES organizations(id)
- created_at TIMESTAMPTZ NOT NULL DEFAULT now()
- updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

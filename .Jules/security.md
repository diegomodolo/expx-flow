# Security Learnings — Expx Flow

## 2026-03-10 - Supabase RLS policies required for all tables

**Learning:** All tables with user data must have Row Level Security (RLS) enabled. Tables like `clients`, `campaigns`, `employees` are scoped by `company_id`.
**Prevention:** Always verify RLS is active when creating new tables. Use `company_id` in policies to isolate tenant data.

## 2026-03-10 - Edge Functions must validate CORS and auth

**Vulnerability:** Edge Functions without CORS headers or JWT verification can be called from unauthorized origins.
**Prevention:** Always include `corsHeaders` and OPTIONS handler. Set `verify_jwt = true` in config.toml for authenticated endpoints. Use `verify_jwt = false` only for webhooks and scheduled tasks.

## 2026-03-10 - Service Role Key restricted to backend only

**Learning:** `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and should never be exposed to the frontend.
**Prevention:** Only use service role key in Edge Functions. Frontend uses `SUPABASE_ANON_KEY` with user session tokens.

## 2026-03-10 - DOMPurify for dangerouslySetInnerHTML

**Vulnerability:** XSS through unsanitized strings rendered with `dangerouslySetInnerHTML`.
**Prevention:** Always use `DOMPurify.sanitize()` (imported via `import DOMPurify from 'dompurify'`) when rendering external or user-generated HTML in React via `dangerouslySetInnerHTML`.

## 2026-03-10 - Route protection

**Vulnerability:** Unprotected routes expose administrative pages to unauthorized access.
**Prevention:** Always wrap non-public routes (e.g., `/super-admin`) in `<ProtectedRoute>` or `<PermissionProtectedRoute>` inside `App.tsx`.

## 2026-03-10 - Multi-tenant Isolation in useCampaigns

**Vulnerability:** The data-fetching hook `useCampaigns.tsx` lacked a `.eq("company_id", activeCompany.company_id)` filter, which could potentially expose campaigns across different tenants, violating the multi-tenant architecture.
**Prevention:** Always verify that every Supabase query or insertion operation in the frontend explicitly uses the `company_id` filter (e.g., via `useCompany()`), ensuring strict isolation of tenant data.

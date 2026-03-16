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

## 2026-03-10 - Avoid Hardcoded Secrets in Templates

**Learning:** String templates or initializers that use `Deno.env.get` with secret keys (like `SUPABASE_SERVICE_ROLE_KEY`) could unintentionally lead developers to use actual secrets in client-side code if they copy-paste the template.
**Prevention:** Always use placeholders (e.g. `<YOUR_SERVICE_ROLE_KEY>`) or comments pointing to environment variables in templates, rather than hardcoding the actual secret name.

## 2026-03-10 - CORS Headers Must Be Properly Formatted

**Learning:** When configuring CORS in Edge Functions, ensure `Access-Control-Allow-Origin` is set to `*` or a specific domain (like `FRONTEND_URL`), and not incorrectly escaped as `\*`.
**Prevention:** Double-check CORS configuration in new Edge Functions to ensure proper JSON/object syntax without unnecessary escaping.

## 2026-03-10 - Ensure JWT Validation for New Edge Functions

**Learning:** All newly created Edge Functions must have explicit configuration in `supabase/config.toml` to enforce JWT validation (`verify_jwt = true`) unless they are webhooks or schedulers.
**Prevention:** Review `config.toml` regularly or script a check to ensure no new functions are left with default (or missing) settings.

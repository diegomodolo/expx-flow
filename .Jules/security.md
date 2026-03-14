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

## 2026-03-14 - Security Audit Findings

**Learnings:**
- `SUPABASE_SERVICE_ROLE_KEY` was found in a static code snippet on the frontend `src/components/skills/SkillCodeEditor.tsx`, however, it was only a string literal (`Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`) and not an actual exposed key.
- `company_api_keys` was queried with `.select("*")` inside `src/components/settings/ApiKeysSettings.tsx`. This exposed the `api_key_hash`. It was replaced by explicit column selection to restrict the exposure of hashed secrets.
- Over 40 Edge Functions were completely missing from `supabase/config.toml`, making their JWT verification status ambiguous. They were all added with `verify_jwt = true` (or `false` for webhooks/background jobs).
- Validated that `dangerouslySetInnerHTML` usages are mostly wrapped with `DOMPurify.sanitize()` where user-input or dynamic content is involved.

**Prevention:**
- Always ensure new Edge Functions are added to `supabase/config.toml` explicitly with `verify_jwt = true` unless specifically intended for unauthenticated external invocations like webhooks.
- Avoid `.select("*")` on tables that store credentials, hashes, or sensitive tokens. Always explicitly select required non-sensitive columns.

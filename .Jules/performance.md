# Performance Learnings — Expx Flow

## 2026-03-10 - Avoid select("\*") in Supabase queries

**Learning:** Using `.select("*")` fetches all columns including large text fields and metadata, causing overfetching.
**Action:** Always specify exact columns needed: `.select("id, name, status, created_at")`.

## 2026-03-10 - Use React Query for all data fetching

**Learning:** Direct `useEffect` + `useState` for API calls causes redundant fetches, no caching, and stale data.
**Action:** Always use `useQuery`/`useMutation` from TanStack React Query with proper `queryKey` for caching and deduplication.

## 2026-03-10 - Large bundle from single entry point

**Learning:** The main bundle is ~9.6MB (2.4MB gzipped). Many page components are imported eagerly.
**Action:** Use `React.lazy()` + `Suspense` for route-level code splitting. Prioritize heavy pages like reports and campaign builders.

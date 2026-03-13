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

## 2026-03-10 - O(1) Data Lookups with Maps

**Learning:** Using `Array.find()` inside maps or render loops introduces O(n) complexity per item, causing performance issues when arrays are large (e.g. `employeesWithPermissions`).
**Action:** Always pre-compute a `Map` structure using `React.useMemo` for O(1) lookups: `new Map(items.map(i => [i.id, i]))`.

## 2026-03-10 - Suspense Boundaries for Code Splitting

**Learning:** When using `React.lazy()` for code-splitting routes, failure to wrap the `<Routes>` in a `<React.Suspense>` boundary causes the application to crash on navigation.
**Action:** Always ensure a `<React.Suspense>` boundary with a fallback UI is placed above the router/routes when implementing lazy loading.

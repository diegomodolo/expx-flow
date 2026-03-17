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

## 2026-03-10 - O(1) Lookups + Batch Fetching

**Learning:** When needing relational data inside a list mapping (like mapping a client name inside a list of tasks), `O(N)` individual `.eq("id", ...)` fetches cause N+1 query performance degradation.
**Action:** Extract unique keys using `new Set()`, fetch in a single `.in("id", [...])` batch, map results using `new Map()`, and retrieve synchronously in `O(1)` time inside the `.map()` loop.

## 2026-03-10 - Component Memoization

**Learning:** Complex layout and wrapper parent components (like Dashboard layouts) trigger frequent re-renders of heavy UI child components (Metrics Cards) receiving objects/arrays.
**Action:** Always wrap `export const Component = React.memo(...)` for components that accept complex props but do not need to inherently re-render on parent render cycles.

## 2026-03-17 - App Routing and Chunk Size

**Learning:** Single-file entrypoints (`App.tsx`) with heavy page imports cause enormous initial JS chunk sizes (over 8MB).
**Action:** Use `React.lazy()` to dynamically import non-critical and nested pages, and ensure they fall under a `<Suspense>` boundary to maintain performance and lower load times.

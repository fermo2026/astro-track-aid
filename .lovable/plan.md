
# Performance Optimization Plan

## Issues Identified

After analyzing the codebase, I found several performance bottlenecks causing slow page loads:

### 1. Sequential Database Queries in `useMonthlyTrend` (Critical)
**File:** `src/hooks/useDashboardStats.ts` (lines 100-127)

The monthly trend hook makes **6 separate sequential database calls** inside a for loop:
```typescript
for (let i = 5; i >= 0; i--) {
  const { count } = await supabase
    .from('violations')
    .select('*', { count: 'exact', head: true })
    .gte('incident_date', start)
    .lte('incident_date', end);
}
```
This means 6 round trips to the server that must complete one after another.

### 2. Multiple Independent API Calls Without Parallelization (Dashboard)
The Dashboard page triggers **10+ separate queries** when loading:
- `useDashboardStats` - 4 sequential queries
- `useDepartmentViolations` - 1 query
- `useMonthlyTrend` - 6 sequential queries  
- `useViolationTypes` - 1 query
- `useExamTypes` - 1 query
- `useRecentViolations` - 1 query
- `PendingActionsWidget` - 1 query

### 3. Fetching Full Tables Instead of Counts
Several queries fetch entire tables to count or process client-side:
- `useDepartmentViolations` fetches all violations just to count by department
- `useViolationTypes` fetches all violations to group by type
- `useExamTypes` fetches all violations to group by exam type

### 4. No Caching/Stale Time Configuration
React Query defaults mean data refetches on every component mount without leveraging caching.

---

## Optimization Strategy

### Phase 1: Fix Critical Sequential Queries

**Update `useMonthlyTrend`:**
- Replace the sequential for-loop with `Promise.all()` to fetch all 6 months in parallel
- Reduces 6 sequential calls to 6 parallel calls (up to 5x faster)

**Update `useDashboardStats`:**
- Use `Promise.all()` to run all 4 count queries simultaneously
- Reduces 4 sequential calls to 4 parallel calls

### Phase 2: Optimize Data Fetching

**Create aggregated database queries:**
- For violation type counts: Fetch and count in a single query with proper grouping
- For exam type counts: Similar optimization
- For department counts: Use proper SQL grouping instead of client-side processing

### Phase 3: Add Proper Caching

**Configure React Query with appropriate staleTime:**
```typescript
{
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000,   // 10 minutes
}
```
This prevents unnecessary refetches when navigating between pages.

---

## Implementation Details

### File Changes

**1. `src/hooks/useDashboardStats.ts`**

Update `useDashboardStats`:
```typescript
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date();
      const startOfThisMonth = startOfMonth(now);
      const endOfThisMonth = endOfMonth(now);

      // Run all queries in parallel
      const [totalResult, pendingResult, resolvedResult, thisMonthResult] = await Promise.all([
        supabase.from('violations').select('*', { count: 'exact', head: true }),
        supabase.from('violations').select('*', { count: 'exact', head: true })
          .or('dac_decision.eq.Pending,cmc_decision.eq.Pending'),
        supabase.from('violations').select('*', { count: 'exact', head: true })
          .neq('dac_decision', 'Pending').neq('cmc_decision', 'Pending'),
        supabase.from('violations').select('*', { count: 'exact', head: true })
          .gte('incident_date', format(startOfThisMonth, 'yyyy-MM-dd'))
          .lte('incident_date', format(endOfThisMonth, 'yyyy-MM-dd')),
      ]);

      return {
        totalViolations: totalResult.count || 0,
        pendingCases: pendingResult.count || 0,
        resolvedCases: resolvedResult.count || 0,
        thisMonthViolations: thisMonthResult.count || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
```

Update `useMonthlyTrend`:
```typescript
export const useMonthlyTrend = () => {
  return useQuery({
    queryKey: ['monthly-trend'],
    queryFn: async (): Promise<MonthlyTrend[]> => {
      const now = new Date();
      
      // Create all promises in parallel
      const monthPromises = Array.from({ length: 6 }, (_, i) => {
        const monthDate = subMonths(now, 5 - i);
        const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');
        
        return supabase
          .from('violations')
          .select('*', { count: 'exact', head: true })
          .gte('incident_date', start)
          .lte('incident_date', end)
          .then(result => ({
            month: format(monthDate, 'MMM'),
            violations: result.count || 0,
          }));
      });

      return Promise.all(monthPromises);
    },
    staleTime: 5 * 60 * 1000,
  });
};
```

Add caching to all other hooks:
- `useDepartmentViolations`: Add `staleTime: 5 * 60 * 1000`
- `useViolationTypes`: Add `staleTime: 5 * 60 * 1000`
- `useExamTypes`: Add `staleTime: 5 * 60 * 1000`
- `useRecentViolations`: Add `staleTime: 2 * 60 * 1000`

**2. `src/pages/Students.tsx`**
Add caching for student and department queries.

**3. `src/pages/Violations.tsx`**
Add caching for violation queries.

**4. `src/pages/UsersRoles.tsx`**
Add caching for user-related queries.

**5. `src/components/dashboard/PendingActionsWidget.tsx`**
Add caching for pending actions query.

---

## Expected Performance Improvements

| Metric | Before | After |
|--------|--------|-------|
| Dashboard initial load | ~10 sequential queries | 6 parallel batches |
| Monthly trend data | 6 sequential calls (~600ms+) | 6 parallel calls (~100ms) |
| Stats counts | 4 sequential calls (~400ms+) | 4 parallel calls (~100ms) |
| Page navigation | Full refetch every time | Cached data, instant render |

**Overall improvement: 3-5x faster page loads**

---

## Technical Notes

- All changes use the existing Supabase client and React Query infrastructure
- No new dependencies required
- Backward compatible with existing data structures
- Error handling remains consistent with current patterns

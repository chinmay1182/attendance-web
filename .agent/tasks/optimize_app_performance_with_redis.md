---
description: Optimize App Performance with Redis
---

# Optimized App Performance with Redis

The user's main objective was to optimize the performance of their Next.js application by integrating Redis as a caching layer.

## Work Completed

### 1. Redis Integration & Hardening
-   **Dependency**: Installed `redis` package.
-   **Client Setup**: Created `src/lib/redis.ts` using a singleton pattern.
-   **Hardening**: Implemented a **2000ms connection timeout** and safe `try/catch` wrappers. This ensures that if the Redis server is unreachable, the application **immediately falls back to Supabase/Postgres** without blocking the user's login or navigation.

### 2. Cache-Aside Implementation (Layered)
Implemented the Cache-Aside pattern across all read-heavy API endpoints. The logic flow is: `Check Redis -> Return if Hit -> Fetch DB -> Cache in Redis -> Return`.

| Feature | Endpoint | Cache TTL |
| :--- | :--- | :--- |
| **User Profile** | `/api/user/profile` | **1 Hour** |
| **Dashboard Stats** | `/api/dashboard/stats` | **10 Mins** |
| **Team Directory** | `/api/team` | **1 Hour** |
| **Attendance** | `/api/attendance/today` | **60 Secs** |
| **Leave History** | `/api/leaves` | **5 Mins** |
| **Company Policies** | `/api/company/policies` | **24 Hours** |
| **Holidays** | `/api/company/holidays` | **24 Hours** |
| **Documents** | `/api/documents` | **1 Hour** |
| **Notices** | `/api/notices` | **1 Hour** |
| **Calendar** | `/api/calendar` | **1 Hour** |
| **App Settings** | `/api/sites/settings` | **24 Hours** |

### 3. Frontend Optimizations
-   **Optimistic UI in Auth**: Immediately loads user profile from `localStorage` while re-validating in the background.
-   **No-Store Fetching**: All client-side calls use `fetch(..., { cache: 'no-store' })` to ensure they hit our Redis-optimized API layer instead of Next.js static cache.
-   **Lazy Loading**: Dashboard widgets (Clock, Leaves) are now lazy-loaded to unblock the main thread.
-   **Parallel Fetching**: Aggregated Dashboard stats into a single parallel server-side request.

### 4. Codebase Refactoring
-   Refactored `AuthContext`, `attendanceService`, `leaveService`, and multiple Page components (`dashboard`, `team`, `calendar`, `documents`, `notices`) to route traffic through the new cached APIs instead of direct redundant DB calls.

## How to Verify
1.  **Connection**: Ensure `REDIS_URL` is set in your `.env`.
2.  **Performance**: Navigate between pages. Second visits should be instant.
3.  **Resilience**: If you stop your Redis server, the app will continue to work (via Supabase fallback) with only a slight performance drop.

The application is now highly optimized for scale, capable of handling high traffic with minimal database load.

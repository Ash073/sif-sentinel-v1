# Phase 2: Layout and Navigation

Our application needs a professional, modern App Shell that will wrap all authenticated routes.

## Instructions

1. Create a `components/layout/AppShell.tsx` which includes:
   - A collapsible Sidebar on the left.
   - A Top Header with a user profile dropdown and breadcrumbs.
   - A main content area with a gray/off-white background for contrast against white cards.
2. Sidebar Navigation Items:
   - "Dashboard" (`/`)
   - "New Report" (`/reports/new`)
   - "Reports History" (`/reports`)
   - "Review Queue" (`/reviews`)
   - "Precursors" (`/precursors`)
3. Use `lucide-react` for icons (e.g., `LayoutDashboard`, `FilePlus`, `History`, `CheckSquare`, `Activity`).
4. Update `app/layout.tsx` (or an authenticated layout group like `app/(app)/layout.tsx`) to wrap pages with the `AppShell`.

## Acceptance Criteria
- The App Shell renders correctly on desktop and mobile.
- The sidebar highlights the active route based on the current URL.
- The layout structure is ready to accept page content.

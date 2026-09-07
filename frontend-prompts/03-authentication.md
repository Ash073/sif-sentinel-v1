# Phase 3: Authentication and User State

The backend uses OAuth2 with Password Flow (Bearer token). 

## Backend API Context
- `POST /api/v1/auth/login`: Accepts `username` and `password` as `application/x-www-form-urlencoded`. Returns `{ access_token, token_type }`.
- `GET /api/v1/users/me`: Requires Bearer token. Returns user details `{ id, email, full_name, role, site_id }`.

## Instructions
1. Create a Login page at `app/login/page.tsx`.
   - A clean, centered card with email/username and password inputs.
   - Submit handler makes POST to `/api/v1/auth/login`.
   - On success, save `access_token` to `localStorage` as `sif_token`.
2. Implement an Auth Provider (`components/providers/AuthProvider.tsx`) utilizing React Context.
   - Fetch `/api/v1/users/me` on mount if a token exists.
   - Provide `user`, `login`, `logout`, and `isLoading` state.
3. Protect the `(app)` route group: if not loading and no user, redirect to `/login`.
4. Update the Header's user profile dropdown to show the current user's `full_name` and a functional "Logout" button.

## Acceptance Criteria
- User can successfully log in and receive a token.
- Invalid credentials display an error toast.
- Authenticated user details are visible in the layout header.
- Unauthenticated access to dashboard redirects to `/login`.

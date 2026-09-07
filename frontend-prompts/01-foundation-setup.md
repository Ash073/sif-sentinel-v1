# Phase 1: Foundation and Setup

We are building a Next.js frontend for the "SIF Sentinel" platform. The backend is a FastAPI application running on `http://localhost:8000/api/v1`. 

## Instructions

1. Initialize a new Next.js 14+ project (App Router) with TypeScript, Tailwind CSS, and ESLint in the `frontend` folder.
2. Install `shadcn/ui` and initialize it. Add the following components immediately: `button`, `card`, `input`, `form`, `toast`, `dropdown-menu`, `dialog`, `skeleton`.
3. Install `axios`, `lucide-react`, and `date-fns`.
4. Create an `.env.local` file with: `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
5. Create a central API client file at `lib/api-client.ts` using Axios.
   - Configure the base URL using the env variable.
   - Set up an interceptor to attach a Bearer token from `localStorage` (key: `sif_token`).
   - Setup a response interceptor to handle 401 errors (e.g., clearing the token and redirecting to `/login`).

## Acceptance Criteria
- Running `npm run dev` yields a functional blank Next.js page.
- Axios client is cleanly configured with token interceptors.
- UI library (shadcn) is ready for use.

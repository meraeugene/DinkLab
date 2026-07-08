# AGENTS.md

Guidance for coding agents working in `Dink Lab`.

## Project Snapshot

`Dink Lab` is a Next.js App Router application for pickleball court booking, payment proof submission, admin booking review, accepted-booking notifications, and reminder emails.

The system uses:

- Next.js App Router for pages, layouts, route groups, API routes, Server Components, and Client Components.
- Server Actions for authenticated business operations and database work.
- Supabase for application data.
- Supabase Auth with Google OAuth for authentication.
- Middleware and role-specific layouts for access control.
- Cloudinary for payment proof uploads.
- SMTP/Nodemailer for booking acceptance and reminder emails.
- Vercel Cron or another scheduler for reminder triggers.

## Commands

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
```

Optional project scripts:

```bash
# none
```

Notes:

- The dev server should run at `http://localhost:3000` unless configured otherwise.
- Document every required external service and local service URL here.
- If Python, workers, queues, or ML scripts are used, document the required command and dependencies.

## Architecture Map

- `app/` is the Next.js App Router surface. It owns routes, layouts, pages, loading states, API route handlers, and page-specific components.
- `app/(root)/` is the public booking and signed-in customer experience.
- `app/(admin)/` is for admin-only flows while preserving public URL segments such as `/admin`.
- `app/auth/` is for unauthenticated authentication pages such as login, signup, forgot password, or reset password.
- `app/api/` is for API route handlers that need raw request/response control.
- `actions/` contains Server Actions grouped by domain.
- `components/` contains all UI components, grouped by feature or surface.
- `components/ui/` contains generic design-system primitives.
- `hooks/` contains client workflow hooks that coordinate component state, actions, and side effects.
- `utils/` contains service clients, validators, formatting helpers, upload helpers, email helpers, and integration helpers.
- `lib/` contains framework-agnostic helpers such as JWT, hashing, crypto, parsing, and generic utilities.
- `types/` contains shared domain interfaces and type definitions.
- `data/` contains static options, seed data, demo data, and local datasets.
- `scripts/` contains seeders, importers, exporters, maintenance scripts, and model scripts.
- `store/` contains client state stores.
- `sections/` contains larger landing/homepage sections when the project uses page sections.
- `public/` contains static assets.

## System Architecture Analysis

The application should be organized by role and responsibility:

- Routing and page composition live in `app/`. Route groups separate access areas without changing URL segments.
- Route folders use real product language in the URL, such as `dashboard`, `settings`, `manage-users`, `my-requests`, `upload-files`, or `search-results`.
- Server Actions in `actions/` are the main data mutation/query boundary for authenticated database work.
- API routes in `app/api/` are reserved for operations needing raw request/response handling, such as uploads, downloads, webhooks, streaming, or long-running process triggers.
- Route folders in `app/` stay framework-only. Keep only Next.js route files such as `page.tsx`, `loading.tsx`, `layout.tsx`, `route.ts`, metadata files, and other App Router special files there.
- UI components live in `components/<feature-or-surface>/`, even when they are currently used by only one route.
- Service integrations are isolated in `utils/<service>/`. Do not configure database, email, storage, or external services directly inside components.
- `middleware.ts`, role layouts, and Server Actions work together for access control.
- Client components may improve UX, but they must not be the only layer enforcing authorization.
- External services are network boundaries and should include failure handling.

## Folder And Filename Conventions

Follow this naming style when adding or moving files:

- Route folder names use kebab-case because they become URL segments: `manage-users`, `forgot-password`, `request-status`, `upload-files`.
- Next.js special files keep exact framework names: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and `route.ts`.
- Route-local React components use PascalCase filenames and should match the main component/export name: `UserTable.tsx`, `SettingsForm.tsx`, `ConfirmModal.tsx`.
- Shared React components in `components/` use PascalCase filenames that match the main component/export name: `Header.tsx`, `Pagination.tsx`, `SearchFilter.tsx`.
- UI primitive files in `components/ui/` use lowercase kebab-case names when following shadcn/Radix conventions: `button.tsx`, `toggle-group.tsx`, `textarea.tsx`.
- Hooks use `use` + PascalCase and the filename should match the hook export: `useSearchResults.ts`, `useManageUsers.ts`.
- Server Action files use camelCase verb or domain names that describe the exported action or action group: `getCurrentUser.ts`, `createRequest.ts`, `approveItem.ts`, `manageUsers.ts`.
- Utility files use camelCase names that match their primary helper: `formatDate.ts`, `getInitials.ts`, `isValidEmail.ts`.
- Type files use camelCase domain names and should stay aligned with the domain they describe: `userSession.ts`, `manageUser.ts`, `searchResult.ts`.
- Store files use camelCase with a `Store` suffix: `userStore.ts`, `cartStore.ts`.
- Static data files use camelCase domain names for TypeScript data and descriptive names for assets or spreadsheets.
- Script files may use camelCase for TypeScript scripts and snake_case for Python scripts.
- Image and media asset filenames in `public/` should be lowercase and descriptive.

When creating a new file, keep the filename the same as the primary component, hook, action, helper, store, or type it exports. If a file exports multiple related functions, name the file after the domain behavior they share.

Do not create vague files such as `helpers.ts`, `utils.ts`, `data.ts`, `component.tsx`, `modal.tsx`, or `newPage.tsx` when a domain-specific name is possible.

## Website Feature And Refactor Template

Use this template when creating a new website area, adding a page, or refactoring an existing flow.

### 1. Define The Website Area

Before coding, identify:

- Role area: public/customer `(root)`, admin `(admin)`, public `auth`, or `api`.
- URL segment: use kebab-case, such as `new-feature`, `manage-records`, or `request-status`.
- Main user workflow: browsing, creating, editing, approving, uploading, searching, or managing.
- Data boundary: Server Action, API route, client-only state, external service, or static data.
- Access boundary: public, authenticated, role-only, admin-only, or shared authenticated.

### 2. Choose The Folder Structure

Use one of these patterns:

```text
app/(role)/route-name/
  page.tsx
  RouteNameClient.tsx
  RouteSpecificComponent.tsx
```

```text
actions/domain/
  getDomainData.ts
  createDomainRecord.ts
  updateDomainRecord.ts
```

```text
hooks/
  useRouteName.ts
```

```text
types/
  routeDomain.ts
```

```text
utils/service-or-domain/
  helperName.ts
```

For route-specific UI, place components in `components/<feature-or-surface>/` and import them into the route page. Do not colocate normal UI components inside route folders.

### 3. Page Implementation Template

Use this shape for normal App Router pages:

```tsx
import { FeatureNameClient } from "@/components/feature-name/FeatureNameClient";

export default async function Page() {
  return <FeatureNameClient />;
}
```

If the page needs server-side session checks or initial data, keep that logic in `page.tsx` and pass typed props into the client component:

```tsx
import { getCurrentUser } from "@/actions/auth/getCurrentUser";
import FeatureNameClient from "./FeatureNameClient";

export default async function Page() {
  const user = await getCurrentUser();

  return <FeatureNameClient user={user} />;
}
```

### 4. Server Action Template

Use this shape for authenticated database work:

```ts
"use server";

import { getSession } from "@/actions/auth/getSession";
import { createClient } from "@/utils/supabase/server";

export async function actionName() {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const client = await createClient();

  // Query or mutate the database here.
}
```

Keep sensitive role checks inside the action even when middleware or layouts already protect the page.

### 5. Refactor Checklist

When refactoring, use this checklist:

- Read this `AGENTS.md` before changing files.
- Refactor one route, role area, or domain at a time.
- Keep routes and URL folder names stable unless the user explicitly requests route changes.
- Preserve access control in `middleware.ts`, role layouts, and Server Actions.
- Keep Server Actions in the correct `actions/<domain>/` folder.
- Keep API routes only for upload/delete/download/webhook/process work that needs request/response control.
- Rename files only when the new filename matches the primary export and improves consistency.
- Update imports immediately after moving or renaming files.
- Keep route UI components in `components/<feature-or-surface>/`.
- Keep shared primitives in `components/ui/` generic and reusable.
- Keep service setup inside `utils/<service>/`.
- Keep type definitions in `types/` when used across routes or domains.
- Avoid moving secrets or privileged database/service clients into browser/client code.
- Run `npm run build` after meaningful refactors when feasible.

### 6. Refactor Prompt Template

Use this prompt when asking an agent to refactor:

```text
Read AGENTS.md first, then refactor <route-or-folder> to follow its architecture, folder naming, and filename conventions.

Scope:
- Refactor only <route-or-folder>.
- Keep routes and behavior working.
- Keep route folders limited to App Router files.
- Move route UI components to `components/<feature-or-surface>/`.
- Keep Server Actions in actions/<domain>/.
- Keep utilities in utils/<service-or-domain>/.
- Keep filenames matched to their primary export.
- Update all imports.
- Run npm run build when feasible.
- Summarize what changed and what was verified.
```

### 7. Handoff Summary Template

When handing off website creation or refactor work, summarize:

```text
Changed:
- Added/updated <route or feature>.
- Moved/refactored <files or folders>.
- Kept naming aligned with AGENTS.md conventions.

Verified:
- Ran <command>.
- Not run: <reason>.

Notes:
- <Any access, environment, or service dependency notes.>
```

## Auth And Access Control

Authentication is Supabase Auth with Google OAuth.

Expected custom JWT flow, if used:

1. Login action validates submitted credentials.
2. User is fetched from the application users table.
3. Password is compared against a secure hash.
4. Session metadata is recorded if the project tracks sessions.
5. A JWT is signed with `JWT_SECRET`.
6. The JWT is stored in an HTTP-only `session` cookie.
7. Middleware verifies the cookie and redirects users based on route and role.

Keep these layers aligned:

- `middleware.ts` handles broad route protection and workflow gates.
- Role-specific layouts enforce role access with server-side redirects.
- Server Actions must still validate session and role before sensitive operations.
- Client components should never be trusted as the only source of authorization.

## Role Areas

Define each role clearly:

- Admin: review, accept, and reject booking submissions.
- Shared authenticated customers: submit booking requests, upload payment proof, view accepted bookings, and receive notifications.
- Public users: view venue details, pricing, amenities, tournament details, map/location information, and sign in with Google.

When adding a new protected route, update:

- `middleware.ts`
- the matching route group layout,
- navigation links,
- Server Action authorization checks,
- and this file.

## Data And Services

Database/service clients:

- `utils/supabase/server.ts` for server runtime access.
- `utils/supabase/browser.ts` for browser access with public keys only.
- `utils/supabase/admin.ts` for server-only privileged access.

External services:

- File storage: Cloudinary
- Email provider: SMTP through Nodemailer
- Search service: none
- Recommendation/ML service: none
- Other integrations: Vercel Cron-compatible reminder endpoint

Environment variables:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAILS
CRON_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_UPLOAD_FOLDER
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_APP_PASSWORD
SMTP_FROM
```

Important:

- Never expose service-role keys, API secrets, email passwords, private tokens, or signing secrets in client code.
- Avoid `NEXT_PUBLIC_` prefixes for secrets.
- Keep `.env.local` out of version control.
- Document every new environment variable in the README.

## Server Actions

Group Server Actions by domain:

```text
actions/auth/
actions/common/
actions/bookings/
```

Action rules:

- Validate session before reading or mutating protected data.
- Validate role before role-specific operations.
- Return predictable result shapes.
- Keep database writes server-side.
- Keep email, upload, and external-service side effects close to the action that triggers them.
- Prefer typed domain objects from `types/`.

## API Routes

Use `app/api/*/route.ts` for:

- file uploads,
- file deletion,
- downloads,
- webhook receivers,
- streaming responses,
- raw request/response integrations,
- long-running script triggers,
- or operations that cannot be expressed cleanly as Server Actions.

API route rules:

- Validate authentication and authorization where needed.
- Validate request payloads.
- Keep secrets server-only.
- Return explicit HTTP status codes.
- Log enough context for debugging without logging secrets.

## UI And Frontend Conventions

- Keep route folders framework-only.
- Put UI components in `components/<feature-or-surface>/`.
- Put design-system primitives in `components/ui/`.
- Put reusable hooks in `hooks/`.
- Use existing components and styling patterns before adding new ones.
- Keep forms accessible and validate on both client and server when appropriate.
- Use loading, empty, error, and success states for user-facing workflows.
- Do not hide authorization problems only with client-side conditional rendering.

## TypeScript Conventions

- Keep strict TypeScript compatibility.
- Prefer the `@/*` path alias for cross-folder imports.
- Put shared domain types in `types/`.
- Avoid repeating loose object shapes across actions/components.
- Keep service response mapping explicit at boundaries.

## Safety Notes

- Do not commit `.env.local` or real secrets.
- Do not import privileged service clients into client components.
- Do not weaken middleware or layout role checks when adding routes.
- Do not trust role or user IDs passed from the browser.
- Do not assume external services are available unless the README says how to run them.
- Keep file deletion logic aligned with the upload provider and resource type.
- Use a strong production signing secret when JWT auth is used.

## Testing And Verification

Before handing off meaningful changes:

- Run `npm run build` when feasible.
- Run `npm run lint` when available.
- Smoke-test affected role flows.
- Verify middleware redirects for protected pages.
- Verify Server Action authorization for sensitive operations.
- For upload changes, test upload and delete paths.
- For email changes, test with safe recipient accounts.
- For external service changes, verify service URLs and failure handling.

## Documentation

Update `README.md` when adding or changing:

- environment variables,
- external services,
- setup commands,
- seed/import scripts,
- route groups,
- roles and permissions,
- file upload behavior,
- email behavior,
- search/recommendation behavior,
- deployment assumptions,
- or auth/session architecture.

## New Project Checklist

Before using this template in a new system:

- Keep route groups aligned with the public/customer `(root)` area and admin `(admin)` area.
- Update command names and seed scripts.
- Update environment variable names.
- Update external service URLs.
- Update the role and workflow gate descriptions.
- Confirm whether auth is custom JWT, Supabase Auth, NextAuth/Auth.js, Clerk, or another provider.
- Remove sections that do not apply.

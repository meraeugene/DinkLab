# Dink Lab

Dink Lab is a Next.js App Router website for booking pickleball court slots, submitting payment proof, reviewing bookings as an admin, and managing court business rules.

The app supports Google sign-in through Supabase Auth, customer booking history, admin booking review, court schedules, editable pricing/hours/courts, Cloudinary payment proof uploads, and SMTP booking acceptance emails.

## Features

### Public And Customer

- Public landing page with venue details, court booking CTA, pricing, amenities, tournament section, and location details.
- Google OAuth sign-in through Supabase.
- Multi-step booking widget:
  - choose court,
  - choose date,
  - choose time,
  - choose payment method,
  - submit payment proof or onsite payment.
- Dynamic court list from admin settings.
- Dynamic pricing bands and operating hours from admin settings.
- Atomic temporary slot holds while the customer completes payment, without a visible countdown.
- Availability checks against temporary holds, pending requests, and confirmed bookings.
- Customer booking history for signed-in users:
  - pending,
  - confirmed,
  - rejected,
  - cancelled.
- Customer can cancel pending bookings.

### Admin

- Protected `/admin` dashboard for configured admin emails only.
- Review Queue:
  - booking cards,
  - payment proof preview,
  - accept booking,
  - reject booking,
  - reschedule individual slots in accepted reservations,
  - cancel an accepted reservation and release all of its slots,
  - conflict warning for already-reserved slots,
  - filters by status, court, date, payment method, and search text.
- Court Schedule:
  - day view,
  - previous/next date controls,
  - confirmed slots grouped by court and hour.
- Business Settings:
  - edit courts,
  - add/delete courts,
  - choose indoor/outdoor court type,
  - edit operating hours,
  - edit pricing bands,
  - import the Dink Lab `.xlsx` booking-list format into Court Schedule.
- Reset Data:
  - admin-only reset tab,
  - hard deletes booking records only,
  - keeps courts, pricing, hours, and admins,
  - requires typing `RESET BOOKINGS`,
  - best-effort Cloudinary payment proof cleanup.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth and database
- Supabase SSR helpers
- SWR for client-side refresh
- Cloudinary for payment proof images
- Nodemailer / SMTP for acceptance emails
- Zod for validation
- Lucide React icons

## Project Structure

```text
src/app/
  (root)/                 Public/customer page
  (admin)/admin/          Admin dashboard route
  api/                    API route handlers
  auth/callback/          Supabase OAuth callback

src/actions/
  admin/                  Admin server actions
  bookings/               Booking server actions

src/components/
  admin/                  Admin dashboard UI
  booking-widget/         Customer booking flow
  customer-bookings/      Customer booking history
  home/                   Landing page sections
  system/                 App/system UI

src/hooks/                SWR hooks and client workflows
src/utils/                Supabase, booking, admin, email, payment helpers
src/types/                Shared domain types
supabase/                 SQL schema and migrations
public/                   Static assets
```

## Requirements

- Node.js 20 or newer recommended
- npm
- Supabase project
- Google OAuth configured in Supabase
- Cloudinary account for payment proof uploads
- SMTP account for email sending

## Environment Variables

Create `.env.local` from `.env.example`.

```bash
cp .env.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAILS=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_FOLDER=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_APP_PASSWORD=
SMTP_FROM=
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe public browser values.
- `SUPABASE_SERVICE_ROLE_KEY`, Cloudinary secrets, and SMTP password must stay server-only.
- `ADMIN_EMAILS` is a comma-separated list of admin email addresses.
- `CLOUDINARY_UPLOAD_FOLDER` defaults in code to `dinklab/payment-proofs` when empty.
- `NEXT_PUBLIC_APP_URL` should be the deployed domain in production.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run:

```sql
-- paste and run supabase/schema.sql
```

4. Confirm these tables exist:
   - `admins`
   - `courts`
   - `bookings`
   - `booking_holds`
   - `booking_settings`
   - `pricing_bands`

5. Confirm these enum values exist:
   - booking status: `PENDING_REVIEW`, `ACCEPTED`, `CANCELLED`, `REJECTED`
   - payment method: `BPI`, `GOTYME`, `ONSITE`

6. Add admin emails:
   - in `.env.local` as `ADMIN_EMAILS`
   - in the `public.admins` table

The schema seeds:

- Court 1 and Court 2
- default operating hours: `8` to `25` meaning 8:00 AM to 1:00 AM next day
- pricing:
  - Morning, 8 AM to 12 PM, PHP 200/hr
  - Afternoon, 12 PM to 4 PM, PHP 250/hr
  - Evening, 4 PM to 1 AM, PHP 300/hr

## Supabase Google Auth

Enable Google OAuth in Supabase Auth.

Add redirect URLs:

```text
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
```

The app redirects admins to `/admin` after sign-in when their email is configured as an admin.

## Install And Run

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Admin dashboard:

```text
http://localhost:3000/admin
```

## Available Scripts

```bash
npm run dev
```

Runs the local development server.

```bash
npm run lint
```

Runs ESLint.

```bash
npm run build
```

Creates a production build and runs TypeScript checks.

```bash
npm run start
```

Runs the production build locally after `npm run build`.

## Booking Flow

1. User signs in with Google.
2. User opens the booking widget.
3. User chooses court, date, and time.
4. The database atomically holds every selected slot while the customer completes payment.
5. User chooses payment method:
   - BPI
   - GoTyme
   - Onsite
6. User submits the booking before the countdown expires.
7. The hold is atomically converted into a `PENDING_REVIEW` booking.
8. Admin accepts or rejects the booking.
9. Accepted bookings become `ACCEPTED`.
10. Acceptance email is sent through SMTP.

Temporary holds, pending bookings, and accepted bookings block slots for other users. Going back or closing the booking flow releases a hold early; otherwise it expires automatically. Online submissions require an uploaded payment screenshot, and pending bookings remain unavailable until an admin rejects or cancels them.

## Admin Review Behavior

Admins can:

- accept pending bookings,
- reject pending bookings,
- reschedule an accepted schedule item to another available court, date, and start time,
- cancel an accepted reservation group and immediately release its slots,
- view payment proof,
- filter and search booking submissions,
- rely on the database to prevent overlapping active submissions.

When accepting a booking, the database function `accept_pending_booking` checks for accepted slot conflicts before updating the status.

Rescheduling preserves the selected schedule item's duration and recorded payment amount. The database rejects replacement times that overlap a temporary hold, pending booking, or accepted booking. Cancelling does not issue a payment refund automatically; admins must handle refunds separately.

## Business Settings

The Business Settings tab lets admins edit operational rules without code changes.

Admins can manage:

- court names,
- indoor/outdoor court type,
- operating hours,
- pricing bands.

Pricing and operating hours are used by:

- booking widget price cards,
- available time slots,
- booking total calculations,
- admin schedule view.

## Reset Data

The Reset Data tab is for testing/demo cleanup.

It deletes:

- all rows in `bookings`

It keeps:

- admins,
- courts,
- pricing bands,
- booking settings.

To reset, type:

```text
RESET BOOKINGS
```

Then click `Reset Bookings`.

Cloudinary payment proof deletion is best-effort. If Cloudinary cleanup fails, the booking reset can still succeed.

## API Routes

Important API routes:

```text
GET    /api/availability
GET    /api/bookings/accepted
GET    /api/bookings/history
GET    /api/admin/bookings
GET    /api/admin/schedule
GET    /api/admin/notifications
POST   /api/cloudinary/upload
DELETE /api/cloudinary/delete
```

Admin APIs require admin access. Customer booking APIs require a signed-in user where applicable.

## Server Actions

Important server actions:

- `createManualBooking`
- `acceptBooking`
- `cancelManualBooking`
- `cancelUserBooking`
- `updateCourts`
- `updateOperatingHours`
- `updatePricingBands`
- `resetBookingData`

Authorization checks happen inside server actions and are not left to client UI only.

## Data And Time Rules

- Stored booking timestamps are timezone-aware.
- Display is based on Asia/Manila.
- Operating hours can extend past midnight by using values greater than 24.
- Example: close hour `25` means 1:00 AM next day.
- Temporary holds reserve selected slots for 10 minutes while payment is completed.
- Pending and accepted bookings continue reserving their slots until cancellation or rejection.

## QA Checklist

Before deployment or after meaningful changes:

```bash
npm run lint
npm run build
```

Manual checks:

- Home page loads.
- Sign in with Google works.
- Booking widget completes all steps.
- Payment proof upload works.
- Pending booking appears in customer booking history.
- Admin Review Queue receives the booking.
- Admin filters/search work.
- Admin can accept a booking.
- Admin can reschedule an accepted slot without changing its duration.
- Admin can cancel an accepted reservation and release all grouped slots.
- A second customer cannot enter payment for a temporarily held slot.
- Pending and accepted bookings block the same slot.
- Customer can cancel pending booking.
- Admin can reject pending booking.
- Court Schedule shows accepted bookings.
- Business Settings saves courts, hours, and pricing independently.
- Reset Data clears bookings only.
- Mobile widths do not horizontally overflow.

Recommended responsive widths:

```text
320px
375px
768px
1024px
1440px
```

## Developer Testing Tools

Current built-in checks:

- ESLint via `npm run lint`
- Next/TypeScript production build via `npm run build`

Recommended future tools:

- Playwright for browser end-to-end tests
- Vitest for pricing/time/availability unit tests
- Lighthouse for accessibility/performance checks

Suggested Playwright install:

```bash
npm install -D @playwright/test
npx playwright install
```

Suggested Vitest install:

```bash
npm install -D vitest
```

## Deployment

Vercel is the expected deployment target.

Deployment checklist:

1. Add all `.env.local` values to Vercel environment variables.
2. Set `NEXT_PUBLIC_APP_URL` to the production domain.
3. Add the production auth callback URL in Supabase.
4. Run `supabase/schema.sql` or required migrations in Supabase.
5. Confirm admin emails exist in `ADMIN_EMAILS` and `public.admins`.
6. Deploy.
7. Test customer booking and admin acceptance in production.

## Troubleshooting

### Admin cannot access `/admin`

Check:

- user is signed in,
- email is in `ADMIN_EMAILS`,
- email exists in `public.admins`,
- Supabase auth session is active.

### Payment proof upload fails

Check:

- Cloudinary env vars,
- upload folder,
- file size/type,
- `/api/cloudinary/upload` response in browser Network tab.

### Acceptance email does not send

Check:

- SMTP env vars,
- Gmail app password if using Gmail,
- SMTP host/port/secure values.

Booking acceptance still succeeds even if email sending fails.

### Booking schema error appears

Run the latest Supabase SQL schema/migration. The app expects booking review fields, `REJECTED` status, temporary booking holds, business settings, and pricing bands.

### Reset Data does not remove images

Cloudinary cleanup is best-effort. The booking rows can still be deleted even if image cleanup fails. Check Cloudinary credentials and stored `payment_proof_public_id` values.

## Security Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY`.
- Never prefix server secrets with `NEXT_PUBLIC_`.
- Keep `.env.local` out of git.
- Admin actions must keep server-side authorization checks.
- Client UI should never be treated as the only security layer.

## License

Private project.

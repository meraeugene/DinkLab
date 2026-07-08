# Dink Lab

Next.js booking app for Dink Lab pickleball courts with Tailwind CSS, Supabase Google auth/database, manual payment review, and Gmail/Nodemailer booking emails.

## Setup

1. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `ADMIN_EMAILS`
   - Cloudinary credentials for payment proof uploads
   - Gmail SMTP values: `SMTP_USER`, `SMTP_APP_PASSWORD`, `SMTP_FROM`
   - `CRON_SECRET` for reminder emails
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Enable Google OAuth in Supabase Auth and set the redirect URL to:
   - `http://localhost:3000/auth/callback` for local development
   - `https://your-domain.com/auth/callback` for production
4. Add admin emails to both `ADMIN_EMAILS` and the `public.admins` table.
5. On Vercel, add the same env vars and keep `vercel.json` so `/api/cron/reminders` runs hourly.

## Commands

```bash
npm run dev
npm run lint
npm run build
```

The app stores booking times in UTC and displays them for Asia/Manila. Submitted bookings start as `PENDING_REVIEW`; admin acceptance changes them to `ACCEPTED`, locks the slot, and sends email.

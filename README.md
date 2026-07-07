# Dink Lab

Next.js booking app for Dink Lab pickleball courts with Tailwind CSS, Supabase Google auth/database, and Xendit hosted checkout.

## Setup

1. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `XENDIT_SECRET_KEY`
   - `XENDIT_CALLBACK_TOKEN`
   - `NEXT_PUBLIC_APP_URL`
   - `ADMIN_EMAILS`
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Enable Google OAuth in Supabase Auth and set the redirect URL to:
   - `http://localhost:3000/auth/callback` for local development
   - `https://your-domain.com/auth/callback` for production
4. Add admin emails to both `ADMIN_EMAILS` and the `public.admins` table.
5. Configure the Xendit invoice/payment webhook URL:
   - `https://your-domain.com/api/xendit/webhook`

## Commands

```bash
npm run dev
npm run lint
npm run build
```

The app stores booking times in UTC and displays them for Asia/Manila. Xendit payment confirmation is handled by webhook before a booking becomes `CONFIRMED`.

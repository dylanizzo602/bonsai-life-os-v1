## Vercel Push Sender Setup (for “app closed” notifications)

This repo includes a Vercel Serverless Function that can deliver **Web Push** to devices stored in Supabase `notification_devices`.

### 1) Deploy to Vercel

- Import this GitHub repo into Vercel.
- Deploy once so you have a production domain.

Endpoints:

- Health: `https://<your-vercel-domain>/api/push/health`
- Send: `https://<your-vercel-domain>/api/push/send`

### 2) Set environment variables in Vercel

In Vercel → Project → Settings → Environment Variables:

- **`NOTIFICATIONS_PUSH_API_KEY`**: random secret (used as `Authorization: Bearer ...`)
- **`SUPABASE_URL`**
- **`SUPABASE_SERVICE_ROLE_KEY`**
- **`NOTIFICATIONS_VAPID_PUBLIC_KEY`**
- **`NOTIFICATIONS_VAPID_PRIVATE_KEY`**
- **`NOTIFICATIONS_VAPID_SUBJECT`**: recommended `mailto:you@domain.com`
- **`VITE_VAPID_PUBLIC_KEY`**: same as `NOTIFICATIONS_VAPID_PUBLIC_KEY` (client needs it to create a subscription)

Redeploy after adding env vars.

### 3) Set Supabase Edge Function secrets (PowerShell-safe)

Supabase Edge Functions restrict secrets prefixed with `SUPABASE_`, so we use `NOTIFICATIONS_SUPABASE_*` for the `notifications` function.

```powershell
supabase secrets set `
  NOTIFICATIONS_PUSH_API_URL="https://<your-vercel-domain>/api/push/send" `
  NOTIFICATIONS_PUSH_API_KEY="<same as NOTIFICATIONS_PUSH_API_KEY>" `
  NOTIFICATIONS_SUPABASE_URL="https://<your-project-ref>.supabase.co" `
  NOTIFICATIONS_SUPABASE_SERVICE_ROLE_KEY="<your service role key>"
```

Then deploy the edge function:

```powershell
supabase functions deploy notifications
```

### 4) Schedule the `notifications` Edge Function

In Supabase (Scheduled Triggers / Cron):

- Run every **1–5 minutes** (recommended: every 1 minute for “due soon” accuracy).

### 5) Verify end-to-end

- In the app (installed PWA), enable Notifications in Settings so a row is created in `notification_devices`.
- Confirm the Vercel health endpoint returns `{ ok: true }`.
- Invoke the edge function with debug enabled:
  - `.../notifications?debug=true`


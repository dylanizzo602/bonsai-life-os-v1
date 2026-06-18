# Feedback email setup (Resend)

Bug reports and feature requests are sent via the `submit-feedback` Supabase Edge Function using [Resend](https://resend.com).

## Prerequisites

1. Create a Resend account and verify a sending domain.
2. Create an API key in the Resend dashboard.

## Supabase secrets

In **Supabase Dashboard → Project Settings → Edge Functions → Secrets**, set:

| Secret | Example |
|--------|---------|
| `RESEND_API_KEY` | `re_...` |
| `FEEDBACK_FROM_EMAIL` | `Bonsai <feedback@yourdomain.com>` (must use a verified domain) |
| `FEEDBACK_TO_EMAIL` | `dylan@dylanizzo.com` |

## Deploy

```bash
supabase db push
supabase functions deploy submit-feedback
```

## Storage

The `feedback-screenshots` bucket is private. Users upload screenshots under `{userId}/...`; the edge function downloads them with the service role and attaches them to bug-report emails.

## Bonsai Push Server

Small Node service that sends **Web Push** notifications (VAPID) to the PWA using stored subscriptions in Supabase (`notification_devices`).

### Environment variables

- **PUSH_API_KEY**: shared secret used by callers (`Authorization: Bearer ...`)
- **SUPABASE_URL**: your Supabase project URL
- **SUPABASE_SERVICE_ROLE_KEY**: service role key (server-only)
- **NOTIFICATIONS_VAPID_PUBLIC_KEY**: VAPID public key (base64url)
- **NOTIFICATIONS_VAPID_PRIVATE_KEY**: VAPID private key (base64url or PEM supported by `web-push`)
- **NOTIFICATIONS_VAPID_SUBJECT**: e.g. `mailto:you@domain.com`
- **PORT**: optional, default `8787`

### Run

```bash
cd push-server
npm install
npm run dev
```

### API

- `GET /health`
- `POST /send` (requires `Authorization: Bearer <PUSH_API_KEY>`)

Body:

```json
{
  "userId": "uuid",
  "title": "Task overdue",
  "body": "Pay rent",
  "data": { "kind": "task", "task_id": "..." }
}
```


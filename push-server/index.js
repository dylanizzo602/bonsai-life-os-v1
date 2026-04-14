/* Push server: receives authenticated send requests and delivers Web Push notifications using VAPID */
import express from 'express'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

/* Environment: required runtime configuration */
const PORT = Number(process.env.PORT ?? 8787)
const PUSH_API_KEY = (process.env.PUSH_API_KEY ?? '').trim()
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim()
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
const VAPID_PUBLIC_KEY = (process.env.NOTIFICATIONS_VAPID_PUBLIC_KEY ?? '').trim()
const VAPID_PRIVATE_KEY = (process.env.NOTIFICATIONS_VAPID_PRIVATE_KEY ?? '').trim()
const VAPID_SUBJECT = (process.env.NOTIFICATIONS_VAPID_SUBJECT ?? 'mailto:notifications@example.com').trim()

/* Startup validation: fail fast if required env vars are missing */
const missing = [
  !PUSH_API_KEY && 'PUSH_API_KEY',
  !SUPABASE_URL && 'SUPABASE_URL',
  !SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
  !VAPID_PUBLIC_KEY && 'NOTIFICATIONS_VAPID_PUBLIC_KEY',
  !VAPID_PRIVATE_KEY && 'NOTIFICATIONS_VAPID_PRIVATE_KEY',
].filter(Boolean)
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(`Missing required env vars: ${missing.join(', ')}`)
  process.exit(1)
}

/* Supabase service client: used to read/write device endpoints securely */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

/* Web Push config: VAPID identification for browser push services */
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

/* Express app: JSON API with a simple bearer-token auth gate */
const app = express()
app.use(express.json({ limit: '1mb' }))

/* Health check: confirms service is running */
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

/* Auth middleware: require Authorization: Bearer <PUSH_API_KEY> */
app.use((req, res, next) => {
  const header = String(req.headers.authorization ?? '')
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (!token || token !== PUSH_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
})

/* Parse helper: extract a PushSubscription-like object from notification_devices.token_or_endpoint */
function parseSubscription(tokenOrEndpoint) {
  try {
    const parsed = JSON.parse(tokenOrEndpoint)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.endpoint !== 'string') return null
    const keys = parsed.keys && typeof parsed.keys === 'object' ? parsed.keys : {}
    if (typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return null
    return { endpoint: parsed.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }
  } catch {
    return null
  }
}

/* Send endpoint: looks up a user's active devices and delivers the push payload */
app.post('/send', async (req, res) => {
  /* Request validation: minimal required fields for a push message */
  const userId = typeof req.body?.userId === 'string' ? req.body.userId : ''
  const title = typeof req.body?.title === 'string' ? req.body.title : 'Bonsai'
  const body = typeof req.body?.body === 'string' ? req.body.body : ''
  const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : undefined

  if (!userId) {
    res.status(400).json({ error: 'Missing userId' })
    return
  }

  /* Device lookup: active endpoints for this user */
  const { data: devices, error } = await supabase
    .from('notification_devices')
    .select('id, token_or_endpoint')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    res.status(500).json({ error: 'Failed to load devices' })
    return
  }

  /* Delivery loop: send to each subscription; deactivate invalid endpoints */
  const results = []
  for (const device of devices ?? []) {
    const subscription = parseSubscription(device.token_or_endpoint)
    if (!subscription) {
      results.push({ deviceId: device.id, status: 'skipped', reason: 'invalid_subscription_json' })
      continue
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon.svg',
      url: '/',
      data,
    })

    try {
      await webpush.sendNotification(subscription, payload)
      results.push({ deviceId: device.id, status: 'sent' })
    } catch (err) {
      const statusCode = Number(err?.statusCode ?? err?.status ?? 0)
      const shouldDeactivate = statusCode === 404 || statusCode === 410
      if (shouldDeactivate) {
        await supabase.from('notification_devices').update({ is_active: false }).eq('id', device.id)
      }
      results.push({
        deviceId: device.id,
        status: 'error',
        statusCode: statusCode || null,
        deactivated: shouldDeactivate,
      })
    }
  }

  res.json({ ok: true, userId, count: results.length, results })
})

/* Server start: listen on configured port */
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Push server listening on :${PORT}`)
})


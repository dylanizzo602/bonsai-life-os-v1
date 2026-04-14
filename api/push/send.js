/* Vercel function: authenticated Web Push sender using VAPID + Supabase device subscriptions */
import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'node:module'

/* Environment: required runtime configuration for secure sending */
const PUSH_API_KEY = (process.env.NOTIFICATIONS_PUSH_API_KEY ?? '').trim()
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim()
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
const VAPID_PUBLIC_KEY = (process.env.NOTIFICATIONS_VAPID_PUBLIC_KEY ?? '').trim()
const VAPID_PRIVATE_KEY = (process.env.NOTIFICATIONS_VAPID_PRIVATE_KEY ?? '').trim()
const VAPID_SUBJECT = (process.env.NOTIFICATIONS_VAPID_SUBJECT ?? 'mailto:notifications@example.com').trim()

/* web-push loader: keep require() inside try/catch to avoid hard-crashing the function */
const require = createRequire(import.meta.url)
let webpush = null
let webpushLoadError = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  webpush = require('web-push')
} catch (error) {
  webpushLoadError = error
}

/* VAPID subject normalization: accept raw emails and convert to a mailto: URL */
function normalizeVapidSubject(subject) {
  if (!subject) return null
  const trimmed = String(subject).trim()
  if (!trimmed) return null
  if (trimmed.startsWith('mailto:')) return trimmed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  if (trimmed.includes('@')) return `mailto:${trimmed}`
  return trimmed
}

/* Supabase service client: read/update notification_devices securely */
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null

/* Web Push config: set VAPID details once per runtime, safely (never crash the function at import time) */
let vapidConfigError = null
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && webpush && typeof webpush.setVapidDetails === 'function') {
  try {
    const normalizedSubject = normalizeVapidSubject(VAPID_SUBJECT)
    webpush.setVapidDetails(
      normalizedSubject ?? 'mailto:notifications@example.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    )
  } catch (error) {
    vapidConfigError = error
  }
}

/* Auth helper: require Authorization: Bearer <NOTIFICATIONS_PUSH_API_KEY> */
function isAuthorized(req) {
  const header = String(req.headers?.authorization ?? '')
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  return Boolean(PUSH_API_KEY) && token === PUSH_API_KEY
}

/* Parse helper: extract a PushSubscription-like object from notification_devices.token_or_endpoint */
function parseSubscription(tokenOrEndpoint) {
  if (typeof tokenOrEndpoint !== 'string') return null
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

/* Error serializer: extract useful details from web-push errors without leaking secrets */
async function serializeWebPushError(err) {
  const statusCode = Number(err?.statusCode ?? err?.status ?? 0) || null
  const message = err instanceof Error ? err.message : String(err)
  const body = typeof err?.body === 'string' ? err.body : null

  return {
    statusCode,
    message,
    body,
  }
}

/* Handler: validate request, load devices, send pushes, deactivate invalid subscriptions */
export default async function handler(req, res) {
  try {
    /* Method guard: only POST is supported */
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    /* Auth guard: block unauthenticated send attempts */
    if (!isAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    /* Env guard: ensure sender has everything needed to operate */
    if (!supabase || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      res.status(500).json({ error: 'Push sender not configured (missing env vars)' })
      return
    }

    /* VAPID guard: surface configuration errors (e.g. invalid subject) */
    if (vapidConfigError) {
      res.status(500).json({
        error: 'Invalid VAPID configuration',
        message: vapidConfigError instanceof Error ? vapidConfigError.message : String(vapidConfigError),
        hint: 'Set NOTIFICATIONS_VAPID_SUBJECT to a URL (recommended: mailto:you@domain.com).',
      })
      return
    }

    /* Dependency guard: surface a clear error if web-push interop fails */
    if (!webpush || typeof webpush.sendNotification !== 'function') {
      res.status(500).json({
        error: 'web-push failed to load at runtime',
        message: webpushLoadError instanceof Error ? webpushLoadError.message : String(webpushLoadError),
      })
      return
    }

    /* Body parsing: extract send parameters */
    const body = req.body ?? {}
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Bonsai'
    const message = typeof body.body === 'string' ? body.body : ''
    const data = body.data && typeof body.data === 'object' ? body.data : undefined

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
        body: message,
        icon: '/icons/icon.svg',
        url: '/',
        data,
      })

      try {
        await webpush.sendNotification(subscription, payload)
        results.push({ deviceId: device.id, status: 'sent' })
      } catch (err) {
        const details = await serializeWebPushError(err)
        const shouldDeactivate = details.statusCode === 404 || details.statusCode === 410
        if (shouldDeactivate) {
          await supabase.from('notification_devices').update({ is_active: false }).eq('id', device.id)
        }
        results.push({
          deviceId: device.id,
          status: 'error',
          statusCode: details.statusCode,
          message: details.message,
          body: details.body,
          deactivated: shouldDeactivate,
        })
      }
    }

    res.status(200).json({ ok: true, userId, count: results.length, results })
  } catch (error) {
    res.status(500).json({
      error: 'Unhandled exception in push sender',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}


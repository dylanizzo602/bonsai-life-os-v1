/* Push client helpers: register service worker, request permission, and manage web push subscriptions */
import { getBrowserVapidPublicKey } from './config'

/* Utility: convert a base64 (URL-safe) VAPID key string into a Uint8Array for PushManager.subscribe */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/* Diagnostics shape: summarize push capability and common failure points for debugging iOS PWA issues */
export interface PushDiagnostics {
  /** Whether this code is running in a browser context */
  hasWindow: boolean
  /** Whether the current context is secure (required for push) */
  isSecureContext: boolean
  /** Whether service workers are available */
  hasServiceWorker: boolean
  /** Whether notifications API is available */
  hasNotification: boolean
  /** Current notification permission state */
  permission: NotificationPermission | 'unsupported'
  /** Whether PushManager appears available on the registration */
  hasPushManager: boolean
  /** Whether a VAPID public key is configured and its apparent length */
  vapidPublicKeyPresent: boolean
  vapidPublicKeyLength: number
  /** Whether a service worker registration was created successfully */
  hasRegistration: boolean
  /** Whether an existing subscription was found */
  hadExistingSubscription: boolean
  /** Whether a new subscription attempt succeeded */
  createdSubscription: boolean
  /** Error message captured during subscribe attempt (if any) */
  subscribeError: string | null
}

/* Register the Bonsai service worker for push notifications, if supported in this browser */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator)) return null

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js')
    return registration
  } catch (error) {
    console.error('Failed to register service worker for notifications:', error)
    return null
  }
}

/* Push diagnostics: attempt subscription flow and return high-signal info for troubleshooting */
export async function getPushDiagnostics(): Promise<PushDiagnostics> {
  /* Runtime capability checks: used to pinpoint iOS/PWA feature support */
  const hasWindow = typeof window !== 'undefined'
  const isSecureContext = hasWindow ? Boolean(window.isSecureContext) : false
  const hasServiceWorker = hasWindow ? 'serviceWorker' in navigator : false
  const hasNotification = hasWindow ? 'Notification' in window : false
  const permission: PushDiagnostics['permission'] = hasNotification ? Notification.permission : 'unsupported'
  const publicKey = getBrowserVapidPublicKey()

  /* Default result: pessimistic values that will be updated as checks succeed */
  const result: PushDiagnostics = {
    hasWindow,
    isSecureContext,
    hasServiceWorker,
    hasNotification,
    permission,
    hasPushManager: false,
    vapidPublicKeyPresent: Boolean(publicKey),
    vapidPublicKeyLength: publicKey ? publicKey.length : 0,
    hasRegistration: false,
    hadExistingSubscription: false,
    createdSubscription: false,
    subscribeError: null,
  }

  /* Registration: must exist before push subscription */
  const registration = await registerServiceWorker()
  if (!registration) {
    return result
  }
  result.hasRegistration = true
  result.hasPushManager = 'pushManager' in registration
  if (!result.hasPushManager) {
    return result
  }

  /* Subscription discovery: indicate whether a subscription already exists */
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    result.hadExistingSubscription = true
    return result
  }

  /* Permission gate: only attempt subscribe when granted */
  const nextPermission = await requestNotificationPermission()
  result.permission = nextPermission
  if (nextPermission !== 'granted') {
    return result
  }

  /* VAPID guard: if missing, subscription cannot be created */
  if (!publicKey) {
    result.subscribeError = 'VAPID public key missing in this build.'
    return result
  }

  try {
    /* Subscribe options: cast to BufferSource for TS DOM compatibility across lib versions */
    const applicationServerKey = urlBase64ToUint8Array(publicKey) as unknown as BufferSource
    await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
    result.createdSubscription = true
    return result
  } catch (error) {
    result.subscribeError = error instanceof Error ? error.message : String(error)
    return result
  }
}

/* Request browser notification permission from the user in a controlled fashion */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }

  const current = Notification.permission
  if (current === 'granted' || current === 'denied') {
    return current
  }

  try {
    return await Notification.requestPermission()
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return 'denied'
  }
}

/* Create or reuse a PushManager subscription for the current device and return the raw subscription object */
export async function getOrCreatePushSubscription(): Promise<PushSubscription | null> {
  const registration = await registerServiceWorker()
  if (!registration || !('pushManager' in registration)) {
    return null
  }

  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    return existing
  }

  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    return null
  }

  const publicKey = getBrowserVapidPublicKey()
  if (!publicKey) {
    console.warn('VAPID public key not configured; cannot create web push subscription.')
    return null
  }

  try {
    /* Subscribe options: cast to BufferSource for TS DOM compatibility across lib versions */
    const applicationServerKey = urlBase64ToUint8Array(publicKey) as unknown as BufferSource
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
    return subscription
  } catch (error) {
    console.error('Error creating web push subscription:', error)
    return null
  }
}

/* Serialize a PushSubscription into a plain JSON payload suitable for sending to Supabase */
export function serializePushSubscription(subscription: PushSubscription | null) {
  if (!subscription) return null
  const json = subscription.toJSON()
  return {
    endpoint: subscription.endpoint,
    keys: json.keys ?? {},
  }
}


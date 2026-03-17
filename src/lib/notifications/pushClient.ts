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
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
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


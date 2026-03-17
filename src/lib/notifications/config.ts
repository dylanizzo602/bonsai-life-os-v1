/* Notifications config: helpers for VAPID and environment-backed notification settings */

/* Browser-side VAPID public key access: used when creating push subscriptions in the PWA */
export function getBrowserVapidPublicKey(): string | null {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    return null
  }
  return key.trim()
}

/* Server-side VAPID configuration: intended for edge functions or backend workers sending web push */
export function getServerVapidConfig() {
  const publicKey = Deno.env.get('NOTIFICATIONS_VAPID_PUBLIC_KEY') ?? ''
  const privateKey = Deno.env.get('NOTIFICATIONS_VAPID_PRIVATE_KEY') ?? ''
  const subject = Deno.env.get('NOTIFICATIONS_VAPID_SUBJECT') ?? 'mailto:notifications@example.com'

  return {
    publicKey,
    privateKey,
    subject,
  }
}


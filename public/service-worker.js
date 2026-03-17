/* Service worker: handle incoming push messages and notification click events for the Bonsai PWA */

/* Push event handler: display a notification using payload data from the server */
self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return event.data ? event.data.json() : {}
    } catch {
      return {}
    }
  })()

  const title = data.title || 'Bonsai'
  const body = data.body || 'You have an update in Bonsai.'
  const icon = data.icon || '/icons/icon-192.png'
  const url = data.url || '/'

  const options = {
    body,
    icon,
    data: {
      url,
      ...data,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

/* Notification click handler: focus existing client or open a new window for the target URL */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url)
        }
        return undefined
      }),
  )
})


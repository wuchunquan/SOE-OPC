export async function isPermissionGranted(): Promise<boolean> {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

export async function requestPermission(): Promise<NotificationPermission | 'denied'> {
  if (typeof Notification === 'undefined') return 'denied'
  return await Notification.requestPermission()
}

export async function sendNotification(options: { title: string; body?: string }): Promise<void> {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
  }
  new Notification(options.title, { body: options.body })
}


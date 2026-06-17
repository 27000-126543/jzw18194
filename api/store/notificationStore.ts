import { getStore, nowISO } from './dataStore'
import type { Notification } from '../../shared/types'

export function findNotificationsByUserId(
  userId: number,
  includeRead = true,
): Notification[] {
  const store = getStore()
  let results = store.notifications.filter((n) => n.userId === userId)
  if (!includeRead) {
    results = results.filter((n) => n.read === 0)
  }
  return [...results].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function findNotificationById(id: number): Notification | undefined {
  const store = getStore()
  return store.notifications.find((n) => n.id === id)
}

export function createNotification(req: {
  userId: number
  type: Notification['type']
  title: string
  content?: string
  relatedId?: number
}): Notification {
  const store = getStore()
  const id = store.nextIds.notifications++
  const now = nowISO()
  const notification: Notification = {
    id,
    userId: req.userId,
    type: req.type,
    title: req.title,
    content: req.content,
    relatedId: req.relatedId,
    read: 0,
    createdAt: now,
  }
  store.notifications.push(notification)
  return notification
}

export function markNotificationRead(id: number): Notification | undefined {
  const store = getStore()
  const idx = store.notifications.findIndex((n) => n.id === id)
  if (idx === -1) return undefined
  store.notifications[idx] = { ...store.notifications[idx], read: 1 }
  return store.notifications[idx]
}

export function markAllNotificationsRead(userId: number): number {
  const store = getStore()
  let count = 0
  for (let i = 0; i < store.notifications.length; i++) {
    if (store.notifications[i].userId === userId && store.notifications[i].read === 0) {
      store.notifications[i] = { ...store.notifications[i], read: 1 }
      count++
    }
  }
  return count
}

export function getUnreadNotificationCount(userId: number): number {
  const store = getStore()
  return store.notifications.filter((n) => n.userId === userId && n.read === 0).length
}

export default {
  findByUserId: findNotificationsByUserId,
  findById: findNotificationById,
  create: createNotification,
  markRead: markNotificationRead,
  markAllRead: markAllNotificationsRead,
  unreadCount: getUnreadNotificationCount,
}

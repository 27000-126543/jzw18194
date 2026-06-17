import { Router } from 'express'
import { z } from 'zod'
import {
  findNotificationsByUserId,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
} from '../store/notificationStore'
import type { Request, Response } from 'express'

const router = Router()

const ok = <T>(res: Response, data: T) => res.json({ ok: true as const, data })
const err = (res: Response, error: string, status = 400) =>
  res.status(status).json({ ok: false as const, error })

const QuerySchema = z.object({
  userId: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((n) => !isNaN(n) && n > 0, 'userId无效'),
  includeRead: z
    .enum(['true', 'false', '1', '0', ''])
    .optional()
    .transform((v) => (v === 'true' || v === '1' ? true : v === 'false' || v === '0' ? false : true)),
  unreadOnly: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
})

router.get('/', (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return err(res, '查询参数无效: ' + parsed.error.issues.map((i) => i.message).join('; '))
  }
  const { userId, includeRead, unreadOnly } = parsed.data
  const effectiveInclude = unreadOnly ? false : includeRead
  const notifications = findNotificationsByUserId(userId, effectiveInclude)
  const unread = getUnreadNotificationCount(userId)
  return ok(res, { items: notifications, unreadCount: unread })
})

router.patch('/:id/read', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id) || id <= 0) return err(res, '无效的通知ID')
  const updated = markNotificationRead(id)
  if (!updated) return err(res, '通知不存在', 404)
  return ok(res, updated)
})

const MarkAllSchema = z.object({
  userId: z.number().int().positive('userId无效'),
})

router.post('/read-all', (req: Request, res: Response) => {
  const parsed = MarkAllSchema.safeParse(req.body)
  if (!parsed.success) {
    return err(res, '参数无效: ' + parsed.error.issues.map((i) => i.message).join('; '))
  }
  const count = markAllNotificationsRead(parsed.data.userId)
  return ok(res, { marked: count })
})

export default router

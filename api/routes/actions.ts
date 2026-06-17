import { Router } from 'express'
import { z } from 'zod'
import {
  findAllActions,
  findActionById,
  updateAction,
} from '../store/actionStore'
import { findMeetingById } from '../store/meetingStore'
import { triggerActionDone } from '../services/notificationService'
import type { Request, Response } from 'express'
import type { ActionStatus } from '../../shared/types'

const router = Router()

const ok = <T>(res: Response, data: T) => res.json({ ok: true as const, data })
const err = (res: Response, error: string, status = 400) =>
  res.status(status).json({ ok: false as const, error })

const QuerySchema = z.object({
  status: z.enum(['todo', 'doing', 'done']).optional(),
  assigneeId: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  projectId: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  meetingId: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
})

const UpdateActionSchema = z.object({
  status: z.enum(['todo', 'doing', 'done']).optional(),
  assigneeId: z.number().int().positive().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为YYYY-MM-DD')
    .optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
})

router.get('/', (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return err(res, '查询参数无效: ' + parsed.error.issues.map((i) => i.message).join('; '))
  }
  const q = parsed.data
  const actions = findAllActions({
    status: q.status as ActionStatus | undefined,
    assigneeId: q.assigneeId,
    projectId: q.projectId,
    meetingId: q.meetingId,
  })
  return ok(res, actions)
})

router.patch('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id) || id <= 0) return err(res, '无效的任务ID')
  const parsed = UpdateActionSchema.safeParse(req.body)
  if (!parsed.success) {
    return err(res, '参数无效: ' + parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '))
  }
  const before = findActionById(id)
  if (!before) return err(res, '任务不存在', 404)
  const updated = updateAction(id, parsed.data)
  if (!updated) return err(res, '任务不存在', 404)
  if (parsed.data.status === 'done' && before.status !== 'done') {
    const meeting = before.meetingId ? findMeetingById(before.meetingId) : undefined
    triggerActionDone(updated, meeting)
  }
  return ok(res, updated)
})

export default router

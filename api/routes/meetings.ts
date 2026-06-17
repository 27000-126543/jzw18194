import { Router } from 'express'
import { z } from 'zod'
import {
  findAllMeetings,
  findMeetingById,
  createMeeting,
  updateMeeting,
  removeMeeting,
  getUnfinishedSiblings,
  computeStats,
} from '../store/meetingStore'
import { findAllActions, updateAction } from '../store/actionStore'
import { findAllUsers } from '../store/userStore'
import { sendMeetingEmails } from '../services/mailService'
import { triggerMeetingCreated, triggerActionDone } from '../services/notificationService'
import type { Request, Response } from 'express'
import type { CreateMeetingRequest, UpdateMeetingRequest } from '../../shared/types'

const router = Router()

const ok = <T>(res: Response, data: T) => res.json({ ok: true as const, data })
const err = (res: Response, error: string, status = 400) =>
  res.status(status).json({ ok: false as const, error })

const ActionOverrideSchema = z.object({
  tempKey: z.string().optional(),
  title: z.string().min(1, '任务标题不能为空'),
  assigneeId: z.number().int().positive('负责人ID无效'),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为YYYY-MM-DD')
    .optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  description: z.string().optional(),
})

const CreateMeetingSchema = z.object({
  title: z.string().min(1, '会议标题不能为空'),
  projectId: z.number().int().positive('项目ID无效'),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为YYYY-MM-DD'),
  participantIds: z.array(z.number().int().positive()).min(1, '至少指定1位参会人'),
  discussionPoints: z.string().default(''),
  decisions: z.string().default(''),
  includeActionIds: z.array(z.number().int()).optional(),
  actionOverrides: z.array(ActionOverrideSchema).optional(),
  createdBy: z.number().int().positive().optional(),
})

const UpdateMeetingSchema = z.object({
  title: z.string().min(1, '会议标题不能为空').optional(),
  projectId: z.number().int().positive('项目ID无效').optional(),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为YYYY-MM-DD').optional(),
  participantIds: z.array(z.number().int().positive()).min(1, '至少指定1位参会人').optional(),
  discussionPoints: z.string().optional(),
  decisions: z.string().optional(),
  includeActionIds: z.array(z.number().int()).optional(),
  actionOverrides: z.array(ActionOverrideSchema).optional(),
  deleted: z.union([z.literal(0), z.literal(1)]).optional(),
})

const QuerySchema = z.object({
  projectId: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  participantId: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  keyword: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

router.get('/', (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return err(res, '查询参数无效: ' + parsed.error.issues.map((i) => i.message).join('; '))
  }
  const q = parsed.data
  const meetings = findAllMeetings({
    projectId: q.projectId,
    participantId: q.participantId,
    keyword: q.keyword,
    from: q.from,
    to: q.to,
  })
  return ok(res, meetings)
})

router.get('/stats', (_req: Request, res: Response) => {
  const stats = computeStats()
  return ok(res, stats)
})

router.get('/unfinished-by-project', (req: Request, res: Response) => {
  const projectIdStr = req.query.projectId as string
  if (!projectIdStr) return err(res, '缺少 projectId 参数')
  const projectId = parseInt(projectIdStr, 10)
  if (isNaN(projectId) || projectId <= 0) return err(res, '无效的 projectId')
  const actions = getUnfinishedSiblings(projectId, undefined)
  return ok(res, actions)
})

router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id) || id <= 0) return err(res, '无效的会议ID')
  const meeting = findMeetingById(id)
  if (!meeting) return err(res, '会议不存在', 404)
  return ok(res, meeting)
})

router.post('/', (req: Request, res: Response) => {
  const parsed = CreateMeetingSchema.safeParse(req.body)
  if (!parsed.success) {
    return err(res, '参数无效: ' + parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '))
  }
  const { createdBy: createdByOpt, ...rest } = parsed.data
  const createdBy = createdByOpt ?? 1
  const meeting = createMeeting(rest as CreateMeetingRequest, createdBy)
  triggerMeetingCreated(meeting)
  return ok(res, meeting)
})

router.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id) || id <= 0) return err(res, '无效的会议ID')
  const parsed = UpdateMeetingSchema.safeParse(req.body)
  if (!parsed.success) {
    return err(res, '参数无效: ' + parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '))
  }
  const meeting = updateMeeting(id, parsed.data as UpdateMeetingRequest)
  if (!meeting) return err(res, '会议不存在', 404)
  return ok(res, meeting)
})

router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id) || id <= 0) return err(res, '无效的会议ID')
  const success = removeMeeting(id)
  if (!success) return err(res, '会议不存在', 404)
  return ok(res, { deleted: true })
})

router.get('/unfinished-by-project', (req: Request, res: Response) => {
  const projectIdStr = req.query.projectId as string
  const projectId = parseInt(projectIdStr, 10)
  if (isNaN(projectId) || projectId <= 0) return err(res, '无效的项目ID')
  const siblings = getUnfinishedSiblings(projectId)
  return ok(res, siblings)
})

router.get('/:id/unfinished-siblings', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id) || id <= 0) return err(res, '无效的会议ID')
  const current = findMeetingById(id)
  if (!current) return err(res, '会议不存在', 404)
  const siblings = getUnfinishedSiblings(current.projectId, id)
  return ok(res, siblings)
})

const SendEmailSchema = z.object({
  ccCreator: z.boolean().optional(),
  customNote: z.string().optional(),
})

router.post('/:id/send-email', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id) || id <= 0) return err(res, '无效的会议ID')
  const meeting = findMeetingById(id)
  if (!meeting) return err(res, '会议不存在', 404)
  const parsed = SendEmailSchema.safeParse(req.body)
  if (!parsed.success) {
    return err(res, '参数无效: ' + parsed.error.issues.map((i) => i.message).join('; '))
  }
  try {
    const users = findAllUsers()
    const result = await sendMeetingEmails(meeting, users, parsed.data)
    return ok(res, result)
  } catch (e) {
    return err(res, '邮件发送失败: ' + (e instanceof Error ? e.message : String(e)), 500)
  }
})

export default router

import { Router } from 'express'
import { z } from 'zod'
import { search } from '../services/searchService'
import type { Request, Response } from 'express'

const router = Router()

const ok = <T>(res: Response, data: T) => res.json({ ok: true as const, data })
const err = (res: Response, error: string, status = 400) =>
  res.status(status).json({ ok: false as const, error })

const SearchQuerySchema = z.object({
  q: z.string().min(1, '搜索关键词不能为空'),
  keyword: z.string().optional(),
  projects: z
    .string()
    .optional()
    .transform((v) =>
      v ? v.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n) && n > 0) : undefined,
    ),
  projectIds: z
    .string()
    .optional()
    .transform((v) =>
      v ? v.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n) && n > 0) : undefined,
    ),
  participants: z
    .string()
    .optional()
    .transform((v) =>
      v ? v.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n) && n > 0) : undefined,
    ),
  participantIds: z
    .string()
    .optional()
    .transform((v) =>
      v ? v.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n) && n > 0) : undefined,
    ),
  from: z.string().optional(),
  to: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

router.get('/', (req: Request, res: Response) => {
  const parsed = SearchQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return err(res, '查询参数无效: ' + parsed.error.issues.map((i) => i.message).join('; '))
  }
  const q = parsed.data
  const result = search({
    keyword: q.q || q.keyword || '',
    projectIds: q.projectIds || q.projects,
    participantIds: q.participantIds || q.participants,
    dateFrom: q.dateFrom || q.from,
    dateTo: q.dateTo || q.to,
  })
  return ok(res, result)
})

export default router

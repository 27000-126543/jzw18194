import { Router } from 'express'
import { z } from 'zod'
import { search } from '../services/searchService'
import type { Request, Response } from 'express'

const router = Router()

const ok = <T>(res: Response, data: T) => res.json({ ok: true as const, data })
const err = (res: Response, error: string, status = 400) =>
  res.status(status).json({ ok: false as const, error })

function parseIdList(v: unknown): number[] | undefined {
  if (!v || typeof v !== 'string') return undefined
  const ids = v.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n) && n > 0)
  return ids.length > 0 ? ids : undefined
}

router.get('/', (req: Request, res: Response) => {
  const raw = req.query
  const keyword = ((raw.q ?? raw.keyword ?? raw.query ?? raw.search) as string || '').trim()
  if (!keyword) {
    return err(res, '搜索关键词不能为空')
  }

  const projectIds = parseIdList(raw.projectIds ?? raw.projects)
  const participantIds = parseIdList(raw.participantIds ?? raw.participants)
  const dateFrom = (raw.dateFrom ?? raw.from) as string | undefined
  const dateTo = (raw.dateTo ?? raw.to) as string | undefined

  const result = search({ keyword, projectIds, participantIds, dateFrom, dateTo })
  return ok(res, result)
})

export default router

import { Router } from 'express'
import { findAllProjects } from '../store/projectStore'
import type { Request, Response } from 'express'

const router = Router()

const ok = <T>(res: Response, data: T) => res.json({ ok: true as const, data })

router.get('/', (_req: Request, res: Response) => {
  const projects = findAllProjects()
  return ok(res, projects)
})

export default router

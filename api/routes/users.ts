import { Router } from 'express'
import { findAllUsers, findUserById } from '../store/userStore'
import { findAllActions } from '../store/actionStore'
import type { Request, Response } from 'express'

const router = Router()

const ok = <T>(res: Response, data: T) => res.json({ ok: true as const, data })
const err = (res: Response, error: string, status = 400) =>
  res.status(status).json({ ok: false as const, error })

router.get('/', (_req: Request, res: Response) => {
  const users = findAllUsers()
  return ok(res, users)
})

router.get('/:id/todos', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id) || id <= 0) return err(res, '无效的用户ID')
  const user = findUserById(id)
  if (!user) return err(res, '用户不存在', 404)
  const actions = findAllActions({ assigneeId: id })
  return ok(res, actions)
})

export default router

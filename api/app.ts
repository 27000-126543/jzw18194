import express from 'express'
import cors from 'cors'
import meetingsRouter from './routes/meetings'
import actionsRouter from './routes/actions'
import usersRouter from './routes/users'
import projectsRouter from './routes/projects'
import searchRouter from './routes/search'
import notificationsRouter from './routes/notifications'
import type { Request, Response, NextFunction } from 'express'

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true as const,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  })
})

app.use('/api/meetings', meetingsRouter)
app.use('/api/actions', actionsRouter)
app.use('/api/users', usersRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/search', searchRouter)
app.use('/api/notifications', notificationsRouter)

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    ok: false as const,
    error: 'Resource not found',
  })
})

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  console.error('[express] unhandled error:', message, stack)
  res.status(500).json({
    ok: false as const,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : message,
  })
})

export default app

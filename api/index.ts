import app from './app'
import { getStore, forceSave } from './store/dataStore'

const PORT = Number(process.env.PORT) || 4000
const HOST = process.env.HOST || '0.0.0.0'

const store = getStore()
console.log(`[dataStore] loaded: users=${store.users.length}, projects=${store.projects.length}, meetings=${store.meetings.filter(m => m.deleted === 0).length}, actions=${store.actionItems.length}, notifications=${store.notifications.length}`)

const server = app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`)
  console.log(`[server] health check: http://${HOST}:${PORT}/api/health`)
})

function shutdown(signal: string) {
  console.log(`[server] received ${signal}, shutting down...`)
  server.close((err) => {
    if (err) {
      console.error('[server] close error:', err)
    }
    forceSave()
    console.log('[server] data persisted, exit.')
    process.exit(err ? 1 : 0)
  })
  setTimeout(() => {
    console.error('[server] force shutdown after timeout')
    forceSave()
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export default server

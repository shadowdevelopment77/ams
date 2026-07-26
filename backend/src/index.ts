import app from "./app"

import { scheduleSessionCleanup } from "./jobs/session-cleanup.job"
import { disconnectPrisma } from "./lib/prisma"

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  scheduleSessionCleanup()
})

// Most hosts (Render included) send SIGTERM before killing the process on
// redeploy/restart -- without this, in-flight requests get dropped and the
// Postgres pool is never drained.
async function shutdown() {
  console.log('Shutting down gracefully...')
  await disconnectPrisma()
  server.close(() => process.exit(0))
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

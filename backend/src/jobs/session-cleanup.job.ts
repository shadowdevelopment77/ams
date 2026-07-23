import cron from "node-cron"
import { sessionRepository } from "../repositories/index.repositories"

export function scheduleSessionCleanup() {
  cron.schedule("0 * * * *", async () => {
    const count = await sessionRepository.deleteExpired()
    if (count > 0) console.log(`[session-cleanup] removed ${count} expired session(s)`)
  })
}

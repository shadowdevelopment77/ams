import app from "./app"
import { validateEnv } from "./lib/env"
import { scheduleSessionCleanup } from "./jobs/session-cleanup.job"

validateEnv()

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  scheduleSessionCleanup()
})

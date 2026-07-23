import app from "./app"

import { scheduleSessionCleanup } from "./jobs/session-cleanup.job"

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  scheduleSessionCleanup()
})

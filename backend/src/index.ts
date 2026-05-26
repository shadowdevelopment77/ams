import express from "express"
import cors from "cors"
import helmet from "helmet"
import dotenv from "dotenv"
import authRouter from "./modules/auth/auth.router"
import cookieParser from "cookie-parser"
import adminRouter from "./modules/user/admin/admin.router"
import divisionRouter from "./modules/division/division.router"
import shiftRouter from "./modules/shift/shift.router"
import attendanceRouter from "./modules/attendance/attendance.router"
import checklistRouter from "./modules/checklist/checklist.router"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000


app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())


app.use("/api/auth", authRouter)
app.use("/api/admin", adminRouter)
app.use("/api/divisions", divisionRouter)
app.use("/api/shifts", shiftRouter)
app.use("/api/attendance", attendanceRouter)
app.use("api/checklist", checklistRouter)


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
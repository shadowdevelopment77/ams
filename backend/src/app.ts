import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import dotenv from "dotenv"
import authRouter from "./modules/auth/auth.router"
import cookieParser from "cookie-parser"
import userRouter from "./modules/user/user.router"
import divisionRouter from "./modules/division/division.router"
import shiftRouter from "./modules/shift/shift.router"
import attendanceRouter from "./modules/attendance/attendance.router"
import checklistRouter from "./modules/checklist/checklist.router"
import companyRouter from "./modules/company/company.router"
import { errorMiddleware } from "./middlewares/error.middleware";
import {apiLimiter, authLimiter} from "./middlewares/rate-limit.middleware";
import visitRouter from "./modules/visit/visit.route"
import { sendSuccess } from "./utils/error.response/response"

dotenv.config()

const app = express()



app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.get('/health', (req, res) => sendSuccess(res, { status: 'ok' }, 'Healthy'))

app.use('/api', apiLimiter)

app.use("/api/auth", authLimiter, authRouter )
app.use("/api/users", userRouter)
app.use("/api/divisions", divisionRouter)
app.use("/api/shift", shiftRouter)
app.use("/api/attendance", attendanceRouter)
app.use("/api/checklist", checklistRouter)
app.use("/api/company", companyRouter)
app.use("/api/visit", visitRouter)
app.use(errorMiddleware)

export default app
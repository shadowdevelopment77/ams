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
import {apiLimiter} from "./middlewares/rate-limit.middleware";
import { resolveUser } from "./middlewares/resolve-user.middleware";
import visitRouter from "./modules/visit/visit.route"
import { sendSuccess } from "./utils/error.response/response"

dotenv.config()

const app = express()



app.use(helmet())
// Comma-separated so the forwarded Codespace URL (manual browser testing)
// and localhost (Playwright, which runs inside the Codespace and never
// needs the forwarded URL) can both be allowed without editing .env and
// restarting every time testing switches between the two.
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean)
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.get('/health', (req, res) => sendSuccess(res, { status: 'ok' }, 'Healthy'))

// resolveUser runs first so apiLimiter can key by authenticated user id
// instead of raw IP -- see rate-limit.middleware.ts.
app.use('/api', resolveUser, apiLimiter)

// authLimiter is applied per-route inside auth.router.ts (login/register/
// logout only) rather than blanket here -- GET /me is a passive session
// check the frontend calls on every page load/refresh, and rate-limiting it
// the same as login/register could lock a real logged-in user out of their
// own session just from normal navigation (multiple tabs, refreshes).
app.use("/api/auth", authRouter)
app.use("/api/users", userRouter)
app.use("/api/divisions", divisionRouter)
app.use("/api/shift", shiftRouter)
app.use("/api/attendance", attendanceRouter)
app.use("/api/checklist", checklistRouter)
app.use("/api/company", companyRouter)
app.use("/api/visit", visitRouter)
app.use(errorMiddleware)

export default app